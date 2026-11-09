import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// Build-time rendering of the XcodeGen project, Info.plist files and export options for one
// application that runs on iPhone, iPad, Mac (Catalyst) and Apple TV.

export interface AppleShellSettings {
  bundleIdentifier: string;
  displayName: string;
  // The recipe's client targets (web ios android macos windows tvos), lower case, separated by spaces. ios builds iPhone and
  // iPad, macos builds Mac, tvos builds Apple TV; web, android and windows are ignored.
  targets: string;
  // Platform and major version, for example "ios17 tvos17 macos14" or "macos14_2"; missing platforms get the defaults.
  deploymentTargets?: string;
  scheme: string;
}

export interface ProjectPackage {
  name: string;
  url: string;
  from: string;
}

export interface AppleRenderOptions {
  // Source folders (relative to the project file) of the components compiled into the application.
  componentSources?: string[];
  packages?: ProjectPackage[];
  serverAddress?: string;
  xcodeVersion?: string;
  orientation?: "portrait" | "all";
  appCategory?: string;
  preGenCommand?: string;
  cameraUsage?: string;
  microphoneUsage?: string;
  backgroundModes?: string[];
  // Prefix of the environment variables that carry the signing team and profile names (default: the scheme in capitals).
  signingPrefix?: string;
}

export class SettingsError extends Error {}

export type Target = "iphone" | "ipad" | "mac" | "tv";
const TARGETS: readonly Target[] = ["iphone", "ipad", "mac", "tv"];
const PLATFORMS = ["ios", "tvos", "macos"] as const;
type PlatformName = (typeof PLATFORMS)[number];
const DEFAULT_DEPLOYMENT: Record<PlatformName, string> = { ios: "17.0", tvos: "17.0", macos: "14.0" };
const SERVER_ADDRESS_KEY = "ShellServerAddress";

// The same grammars aepm applies to collected string settings.
const QUALIFIED = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const LABEL = /^[A-Za-z][A-Za-z0-9 -]{0,63}$/;
const ADDRESS = /^https?:\/\/[A-Za-z0-9.-]+(:[0-9]{1,5})?(\/[A-Za-z0-9_/-]*)?$/;

const words = (value: string) => value.split(/\s+/).filter(Boolean);

// Recipe client targets that are not Apple ones; they are ignored.
const OTHER_TARGETS: readonly string[] = ["web", "android", "windows"];
const RECIPE_TARGETS: Record<string, readonly Target[]> = { ios: ["iphone", "ipad"], macos: ["mac"], tvos: ["tv"] };

// Returns the Apple targets named, in fixed order; an empty list when the text names only non-Apple targets.
export function parseTargets(value: string): Target[] {
  if (typeof value !== "string") throw new SettingsError("targets must be a string");
  if (!words(value).length) throw new SettingsError("targets must not be empty");
  const found = new Set<Target>();
  const seen = new Set<string>();
  for (const word of words(value)) {
    const apple = Object.hasOwn(RECIPE_TARGETS, word) ? RECIPE_TARGETS[word] : undefined;
    if (!apple && !OTHER_TARGETS.includes(word)) throw new SettingsError(`unknown target ${word}; expected ${[...Object.keys(RECIPE_TARGETS), ...OTHER_TARGETS].join(", ")}`);
    if (seen.has(word)) throw new SettingsError(`target ${word} is listed twice`);
    seen.add(word);
    for (const target of apple ?? []) found.add(target);
  }
  return TARGETS.filter((target) => found.has(target));
}

export function parseDeploymentTargets(value: string | undefined): Record<PlatformName, string> {
  const result = { ...DEFAULT_DEPLOYMENT };
  const seen = new Set<string>();
  for (const word of words(value ?? "")) {
    const match = /^(ios|tvos|macos)(\d{1,2})(?:_(\d{1,2}))?$/.exec(word);
    if (!match) throw new SettingsError(`cannot read deployment target ${word}; expected for example ios17 or macos14_2`);
    if (seen.has(match[1])) throw new SettingsError(`deployment target ${match[1]} is listed twice`);
    seen.add(match[1]);
    result[match[1] as PlatformName] = `${Number(match[2])}.${Number(match[3] ?? 0)}`;
  }
  return result;
}

export interface Plan {
  targets: Target[];
  application: boolean;
  tv: boolean;
  destinations: string[];
  deviceFamily: string;
}

// iPhone and iPad share one application target; Mac Catalyst needs the iPad idiom; tv is its own target.
export function plan(targets: Target[]): Plan {
  const phone = targets.includes("iphone");
  const pad = targets.includes("ipad");
  const mac = targets.includes("mac");
  const destinations = [...(phone || pad ? ["iOS"] : []), ...(mac ? ["macCatalyst"] : [])];
  const deviceFamily = mac || (phone && pad) ? "1,2" : phone ? "1" : "2";
  return { targets, application: destinations.length > 0, tv: targets.includes("tv"), destinations, deviceFamily };
}

export interface ResolvedAppleSettings {
  bundleIdentifier: string;
  displayName: string;
  scheme: string;
  plan: Plan;
  deployment: Record<PlatformName, string>;
}

export function validateSettings(settings: AppleShellSettings): ResolvedAppleSettings {
  if (typeof settings.bundleIdentifier !== "string" || !QUALIFIED.test(settings.bundleIdentifier)) throw new SettingsError("bundleIdentifier must be lower-case words separated by dots");
  if (typeof settings.displayName !== "string" || !LABEL.test(settings.displayName)) throw new SettingsError("displayName must be a label");
  if (typeof settings.scheme !== "string" || !IDENTIFIER.test(settings.scheme)) throw new SettingsError("scheme must be an identifier");
  return {
    bundleIdentifier: settings.bundleIdentifier,
    displayName: settings.displayName,
    scheme: settings.scheme,
    plan: plan(parseTargets(settings.targets)),
    deployment: parseDeploymentTargets(settings.deploymentTargets),
  };
}

const ESCAPES: Record<string, (value: string) => string> = {
  json: (value) => JSON.stringify(value),
  html: (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"),
  raw: (value) => value,
};
const TOKEN = /\{\{([A-Za-z][A-Za-z0-9]*)(?::(json|html))?\}\}/g;

// {{name}} inserts raw text; {{name:json}} writes a quoted string (valid YAML and JSON); {{name:html}} escapes markup.
export function fill(template: string, values: Record<string, string>): string {
  if (template.replace(TOKEN, "").includes("{{")) throw new SettingsError("template has a malformed token");
  return template.replace(TOKEN, (_match, name: string, mode: string | undefined) => {
    if (!Object.hasOwn(values, name)) throw new SettingsError(`template names unknown value ${name}`);
    return ESCAPES[mode ?? "raw"](values[name]);
  });
}

const template = (name: string) => readFileSync(new URL(`./templates/${name}`, import.meta.url), "utf8");
const lines = (items: string[], indent: string) => items.map((item) => `${indent}${item}`).join("\n");
const block = (text: string) => (text.endsWith("\n") ? text : text + "\n");

function checkOptions(options: AppleRenderOptions): void {
  for (const path of options.componentSources ?? []) if (!/^(\.\.\/)*[A-Za-z0-9_][A-Za-z0-9_./-]*$/.test(path) || path.includes("/../")) throw new SettingsError(`component source ${path} must be a plain relative path`);
  for (const item of options.packages ?? []) {
    if (!IDENTIFIER.test(item.name) || !/^https:\/\/[A-Za-z0-9./_-]+$/.test(item.url) || !/^[0-9][0-9.]*$/.test(item.from)) throw new SettingsError(`package ${item.name} needs an identifier name, an https url and a numeric version`);
  }
  if (options.serverAddress !== undefined && !ADDRESS.test(options.serverAddress)) throw new SettingsError("serverAddress must be an address");
  if (options.signingPrefix !== undefined && !/^[A-Z][A-Z0-9_]{0,63}$/.test(options.signingPrefix)) throw new SettingsError("signingPrefix must be capitals, digits and underscores");
  if (options.appCategory !== undefined && !/^public\.app-category\.[a-z-]+$/.test(options.appCategory)) throw new SettingsError("appCategory must be a public.app-category value");
  if (options.preGenCommand !== undefined && !/^[A-Za-z0-9_./ -]+$/.test(options.preGenCommand)) throw new SettingsError("preGenCommand must be a plain command");
  for (const mode of options.backgroundModes ?? []) if (!/^[a-z-]+$/.test(mode)) throw new SettingsError(`background mode ${mode} is not valid`);
}

// Property-list entries: one line each on tv, key and value on separate lines elsewhere.
function usage(options: AppleRenderOptions, tv: boolean): string {
  const entries: [string, string][] = [
    ["NSCameraUsageDescription", options.cameraUsage ?? "Shows your video to the other people in the session."],
    ["NSMicrophoneUsageDescription", options.microphoneUsage ?? "Lets the other people in the session hear you."],
  ];
  return entries.map(([key, value]) => tv ? `    <key>${key}</key><string>${ESCAPES.html(value)}</string>\n` : `\t<key>${key}</key>\n\t<string>${ESCAPES.html(value)}</string>\n`).join("");
}

export function renderProject(settings: ResolvedAppleSettings, options: AppleRenderOptions = {}): string {
  checkOptions(options);
  const { plan: p, scheme } = settings;
  const signingPrefix = options.signingPrefix ?? scheme.toUpperCase();
  const own = [`${scheme}/Sources`, "../components/apple-host/apple/Sources", ...(options.componentSources ?? [])];
  const sources = lines(own.map((path) => `- ${path}`), "      ");
  const dependencies = options.packages?.length ? "    dependencies:\n" + lines(options.packages.map((item) => `- package: ${item.name}`), "      ") + "\n" : "";
  const packages = options.packages?.length
    ? "packages:\n" + options.packages.map((item) => `  ${item.name}:\n    url: ${item.url}\n    from: ${item.from}\n`).join("")
    : "";
  const deployment = [`iOS: ${JSON.stringify(settings.deployment.ios)}`, `tvOS: ${JSON.stringify(settings.deployment.tvos)}`];
  const orientations = options.orientation === "all" ? '"UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight"' : "UIInterfaceOrientationPortrait";
  const common = { scheme, bundleIdentifier: settings.bundleIdentifier, sources, dependencies, signingPrefix };
  let targets = "";
  let schemes = "";
  if (p.application) {
    const mac = p.destinations.includes("macCatalyst")
      ? fill(template("mac-settings.yml.template"), { macosVersion: settings.deployment.macos, scheme, appCategory: options.appCategory ?? "public.app-category.entertainment" })
      : "";
    targets += fill(template("app-target.yml.template"), { ...common, destinations: p.destinations.join(", "), deviceFamily: p.deviceFamily, orientations, macSettings: mac });
    schemes += fill(template("scheme.yml.template"), { name: scheme });
  }
  if (p.tv) {
    targets += fill(template("tv-target.yml.template"), common);
    schemes += fill(template("scheme.yml.template"), { name: `${scheme}TV` });
  }
  return fill(template("project.yml.template"), {
    scheme, bundleIdPrefix: settings.bundleIdentifier.split(".").slice(0, -1).join("."), displayName: settings.displayName,
    serverAddress: options.serverAddress ?? "", xcodeVersion: options.xcodeVersion ?? "26.0", packages,
    deploymentTargets: lines(deployment, "    "), preGenCommand: options.preGenCommand ? `  preGenCommand: ${JSON.stringify(options.preGenCommand)}\n` : "",
    targets: block(targets), schemes: schemes.replace(/\n$/, ""),
  });
}

export function renderInfoPlist(options: AppleRenderOptions = {}): string {
  checkOptions(options);
  const phone = options.orientation === "all"
    ? ["Portrait", "LandscapeLeft", "LandscapeRight"] : ["Portrait"];
  const modes = options.backgroundModes ?? ["audio"];
  const background = modes.length
    ? `\t<key>UIBackgroundModes</key>\n\t<array>\n${modes.map((mode) => `\t\t<string>${mode}</string>`).join("\n")}\n\t</array>\n` : "";
  const usageLines = usage(options, false);
  return fill(template("Info.plist.template"), {
    phoneOrientations: phone.map((name) => `\t\t<string>UIInterfaceOrientation${name}</string>`).join("\n"),
    usage: usageLines, backgroundModes: background, serverAddressKey: SERVER_ADDRESS_KEY,
  });
}

export function renderTvInfoPlist(options: AppleRenderOptions = {}): string {
  checkOptions(options);
  return fill(template("InfoTV.plist.template"), { usage: usage(options, true), serverAddressKey: SERVER_ADDRESS_KEY });
}

export function renderExportOptions(bundleIdentifier: string, kind: "ios" | "macos" | "tvos"): string {
  return fill(template("ExportOptions.plist.template"), {
    bundleIdentifier,
    installer: kind === "macos" ? "  <key>installerSigningCertificate</key><string>Mac Installer Distribution</string>\n" : "",
  });
}

function skeleton(directory: URL, base = ""): Record<string, string> {
  const files: Record<string, string> = {};
  for (const entry of readdirSync(directory).sort()) {
    const full = new URL(entry + (statSync(new URL(entry, directory)).isDirectory() ? "/" : ""), directory);
    if (statSync(full).isDirectory()) Object.assign(files, skeleton(full, `${base}${entry}/`));
    else files[`${base}${entry}`] = readFileSync(full, "utf8");
  }
  return files;
}

export interface AppleRender {
  // Output path (relative to the Apple project folder) to file text; empty when no target is an Apple one.
  files: Record<string, string>;
  message: string;
}

export function renderApple(settings: AppleShellSettings, options: AppleRenderOptions = {}): AppleRender {
  const resolved = validateSettings(settings);
  const { plan: p, scheme } = resolved;
  if (!p.application && !p.tv) {
    return { files: {}, message: `No Apple project written: targets "${settings.targets.trim()}" name no Apple target (ios, macos or tvos). Select apple-host only when the application targets iPhone, iPad, Mac or Apple TV.` };
  }
  const files: Record<string, string> = { "project.yml": renderProject(resolved, options) };
  if (p.application) {
    files[`${scheme}/Info.plist`] = renderInfoPlist(options);
    if (p.destinations.includes("macCatalyst")) files[`${scheme}/MacCatalyst.entitlements`] = template("MacCatalyst.entitlements");
    if (p.destinations.includes("iOS")) files["ExportOptions-ios.plist"] = renderExportOptions(resolved.bundleIdentifier, "ios");
    if (p.destinations.includes("macCatalyst")) files["ExportOptions-macos.plist"] = renderExportOptions(resolved.bundleIdentifier, "macos");
  }
  if (p.tv) {
    files[`${scheme}TV/Info.plist`] = renderTvInfoPlist(options);
    files["ExportOptions-tvos.plist"] = renderExportOptions(resolved.bundleIdentifier, "tvos");
    for (const [path, text] of Object.entries(skeleton(new URL("./templates/tv-assets/", import.meta.url)))) files[`${scheme}TV/Assets.xcassets/${path}`] = text;
  }
  return { files, message: `Apple project written for ${p.targets.join(", ")}: ${Object.keys(files).length} files.` };
}

export function writeApple(directory: string, files: Record<string, string>): void {
  for (const [path, text] of Object.entries(files)) {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
  }
}
