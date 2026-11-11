import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fill, parseDeploymentTargets, parseTargets, plan, renderApple, renderExportOptions, SettingsError, validateSettings, writeApple } from "../implementation/apple/render.ts";
import { buildProject } from "../examples/consumer.ts";

const fixture = JSON.parse(readFileSync(new URL("fixtures/application.json", import.meta.url), "utf8"));
const { settings, options } = fixture;
const all = renderApple(settings, options).files;

test("targets are space-separated recipe words in fixed order; unknown, repeated, comma-joined and upper-case words are refused", () => {
  assert.deepEqual(parseTargets("tvos  macos"), ["mac", "tv"]);
  for (const bad of ["", "  ", "watch", "ios ios", "web web", "ios,tvos", "iphone", "ipad", "mac", "tv", "IOS"]) assert.throws(() => parseTargets(bad), SettingsError, bad);
});

test("the recipe's client target list is filtered to the Apple targets and mapped to the Apple names", () => {
  assert.deepEqual(parseTargets("web ios android macos windows tvos"), ["iphone", "ipad", "mac", "tv"]);
  assert.deepEqual(parseTargets("ios"), ["iphone", "ipad"]);
  assert.deepEqual(parseTargets("macos"), ["mac"]);
  assert.deepEqual(parseTargets("tvos web"), ["tv"]);
  assert.deepEqual(parseTargets("web android"), []);
});

test("the full six-target list renders the Apple project for iPhone, iPad, Mac and Apple TV", () => {
  const sixTargets = "web ios android macos windows tvos";
  const six = renderApple({ ...settings, targets: sixTargets }, options);
  assert.deepEqual(six.files, all);
  assert.match(six.message, /^Apple project written for iphone, ipad, mac, tv: \d+ files\.$/);
  assert.equal(validateSettings({ ...settings, targets: sixTargets }).plan.deviceFamily, "1,2");
});

test("each Apple recipe target alone gives the matching project", () => {
  const ios = renderApple({ ...settings, targets: "web ios" }, {}).files;
  assert.deepEqual(Object.keys(ios).sort(), ["Demo/Info.plist", "ExportOptions-ios.plist", "project.yml"]);
  assert.match(ios["project.yml"], /supportedDestinations: \[iOS\]/);
  assert.match(ios["project.yml"], /TARGETED_DEVICE_FAMILY: "1,2"/);
  const mac = renderApple({ ...settings, targets: "macos android" }, {}).files;
  assert.match(mac["project.yml"], /supportedDestinations: \[macCatalyst\]/);
  assert.ok("ExportOptions-macos.plist" in mac && !("DemoTV/Info.plist" in mac));
  const tv = renderApple({ ...settings, targets: "tvos windows" }, {}).files;
  assert.ok("DemoTV/Info.plist" in tv && !("Demo/Info.plist" in tv));
});

test("web only, or any list with no Apple target, writes no Apple project and says why", () => {
  for (const targets of ["web", "web android windows", "android windows"]) {
    const result = renderApple({ ...settings, targets }, options);
    assert.deepEqual(result.files, {}, targets);
    assert.match(result.message, /^No Apple project written: targets ".+" name no Apple target \(ios, macos or tvos\)/, targets);
    assert.ok(result.message.includes(targets), targets);
  }
  const directory = mkdtempSync(join(tmpdir(), "apple-host-"));
  const built = buildProject(directory, { ...settings, targets: "web" }, options);
  assert.deepEqual(built.written, []);
  assert.match(built.message, /No Apple project written/);
  assert.deepEqual(readdirSync(directory), []);
});

test("deployment targets override the defaults and refuse unreadable text", () => {
  assert.deepEqual(parseDeploymentTargets(undefined), { ios: "17.0", tvos: "17.0", macos: "14.0" });
  assert.deepEqual(parseDeploymentTargets("ios18 macos15_2"), { ios: "18.0", tvos: "17.0", macos: "15.2" });
  for (const bad of ["ios", "watchos10", "ios17 ios18", "ios17.0.1", "iOS=16.4", "ios16.4", "IOS17"]) assert.throws(() => parseDeploymentTargets(bad), SettingsError, bad);
});

test("one application target serves iPhone, iPad and Mac, and tv is separate", () => {
  assert.deepEqual(plan(["iphone", "ipad", "mac", "tv"]), { targets: ["iphone", "ipad", "mac", "tv"], application: true, tv: true, destinations: ["iOS", "macCatalyst"], deviceFamily: "1,2" });
  assert.equal(plan(["iphone"]).deviceFamily, "1");
  assert.equal(plan(["ipad"]).deviceFamily, "2");
  assert.equal(plan(["mac"]).deviceFamily, "1,2");
  assert.deepEqual(plan(["mac"]).destinations, ["macCatalyst"]);
  assert.equal(plan(["tv"]).application, false);
});

test("settings are validated", () => {
  const bad = (change: Record<string, string>) => assert.throws(() => validateSettings({ ...settings, ...change }), SettingsError);
  bad({ bundleIdentifier: "Example" });
  bad({ bundleIdentifier: "app.Example.demo" });
  bad({ displayName: "<Demo>" });
  bad({ scheme: "1Demo" });
  bad({ targets: "watch" });
  bad({ targets: "" });
  assert.equal(validateSettings(settings).plan.destinations.length, 2);
  assert.equal(validateSettings({ ...settings, targets: "web" }).plan.application, false);
});

test("the full project names every target, destination, signing variable and component source", () => {
  const yaml = all["project.yml"];
  assert.match(yaml, /^name: "Demo"$/m);
  assert.match(yaml, /bundleIdPrefix: "app.example"/);
  assert.match(yaml, /supportedDestinations: \[iOS, macCatalyst\]/);
  assert.match(yaml, /TARGETED_DEVICE_FAMILY: "1,2"/);
  assert.match(yaml, /TARGETED_DEVICE_FAMILY: "3"/);
  assert.match(yaml, /^  DemoTV:$/m);
  assert.match(yaml, /PRODUCT_BUNDLE_IDENTIFIER: "app.example.demo"/);
  assert.match(yaml, /MACOSX_DEPLOYMENT_TARGET\[sdk=macosx\*\]": "14.0"/);
  assert.match(yaml, /LSApplicationCategoryType\[sdk=macosx\*\]": public.app-category.entertainment/);
  assert.match(yaml, /iOS: "17.0"\n    tvOS: "17.0"/);
  assert.match(yaml, /- \.\.\/components\/apple-host\/apple\/Sources\n      - \.\.\/components\/other\/apple\/Sources/);
  assert.match(yaml, /DEVELOPMENT_TEAM: "\$\(DEMO_TEAM\)"/);
  assert.match(yaml, /PROVISIONING_PROFILE_SPECIFIER: "\$\(DEMO_TV_PROFILE\)"/);
  assert.match(yaml, /packages:\n  Remote:\n    url: https:\/\/github.com\/example\/remote-sdk\n    from: 1.2.0/);
  assert.match(yaml, /SHELL_SERVER_ADDRESS: "https:\/\/server.example.com"/);
  assert.doesNotMatch(yaml, /\{\{|\}\}/);
});

test("target choice changes the files", () => {
  const phoneOnly = renderApple({ ...settings, targets: "ios" }, {}).files;
  assert.deepEqual(Object.keys(phoneOnly).sort(), ["Demo/Info.plist", "ExportOptions-ios.plist", "project.yml"]);
  assert.doesNotMatch(phoneOnly["project.yml"], /macCatalyst|DemoTV|MACOSX_DEPLOYMENT_TARGET|packages:|dependencies:/);
  assert.match(phoneOnly["project.yml"], /supportedDestinations: \[iOS\]/);
  assert.match(phoneOnly["project.yml"], /TARGETED_DEVICE_FAMILY: "1,2"/);
  const tvOnly = renderApple({ ...settings, targets: "tvos" }, {}).files;
  assert.deepEqual(Object.keys(tvOnly).filter((path) => !path.includes("Assets.xcassets")).sort(), ["DemoTV/Info.plist", "ExportOptions-tvos.plist", "project.yml"]);
  assert.doesNotMatch(tvOnly["project.yml"], /supportedDestinations/);
  const macOnly = renderApple({ ...settings, targets: "macos" }, {}).files;
  assert.ok("Demo/MacCatalyst.entitlements" in macOnly && "ExportOptions-macos.plist" in macOnly && !("ExportOptions-ios.plist" in macOnly));
  assert.match(macOnly["project.yml"], /supportedDestinations: \[macCatalyst\]/);
});

test("property lists carry the build settings, usage text and server address key", () => {
  const phone = all["Demo/Info.plist"];
  assert.match(phone, /<string>\$\(SHELL_DISPLAY_NAME\)<\/string>/);
  assert.match(phone, /<key>ShellServerAddress<\/key>\s*<string>\$\(SHELL_SERVER_ADDRESS\)<\/string>/);
  assert.match(phone, /UIBackgroundModes/);
  assert.match(phone, /<string>UIInterfaceOrientationPortrait<\/string>\n\t<\/array>\n\t<key>UISupportedInterfaceOrientations~ipad/);
  const custom = renderApple({ ...settings, targets: "ios tvos" }, { cameraUsage: "Shows <you>", microphoneUsage: "Hears you", backgroundModes: [], orientation: "all" }).files;
  assert.match(custom["Demo/Info.plist"], /Shows &lt;you&gt;/);
  assert.doesNotMatch(custom["Demo/Info.plist"], /UIBackgroundModes/);
  assert.match(custom["Demo/Info.plist"], /LandscapeLeft<\/string>\n\t\t<string>UIInterfaceOrientationLandscapeRight/);
  assert.match(custom["DemoTV/Info.plist"], /Hears you/);
  assert.match(custom["project.yml"], /SUPPORTED_INTERFACE_ORIENTATIONS: "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight"/);
  for (const text of Object.values(all)) assert.doesNotMatch(text, /\{\{|\}\}/);
});

test("export options name the bundle identifier and only the Mac one signs an installer", () => {
  assert.match(renderExportOptions("app.example.demo", "ios"), /<key>app.example.demo<\/key><string>PROFILE_NAME<\/string>/);
  assert.match(renderExportOptions("app.example.demo", "macos"), /Mac Installer Distribution/);
  assert.doesNotMatch(renderExportOptions("app.example.demo", "tvos"), /Installer/);
});

test("the tv asset catalogue skeleton is written and the application supplies the images", () => {
  const paths = Object.keys(all).filter((path) => path.startsWith("DemoTV/Assets.xcassets/"));
  assert.equal(paths.length, 14);
  assert.ok(paths.includes("DemoTV/Assets.xcassets/AppIcon.brandassets/Contents.json"));
  assert.equal(JSON.parse(all["DemoTV/Assets.xcassets/AppIcon.brandassets/Contents.json"]).assets.length, 4);
});

test("options that could inject text are refused", () => {
  const bad = (change: Record<string, unknown>) => assert.throws(() => renderApple(settings, { ...options, ...change }), SettingsError);
  bad({ componentSources: ["../../etc/passwd/../x"] });
  bad({ componentSources: ["/absolute"] });
  bad({ packages: [{ name: "X", url: "http://insecure.example/x", from: "1" }] });
  bad({ serverAddress: "ftp://x" });
  bad({ signingPrefix: "lower" });
  bad({ preGenCommand: "x; rm -rf /" });
  bad({ backgroundModes: ["audio</string>"] });
});

test("template filler escapes by context", () => {
  assert.equal(fill('{{a:json}} {{a:html}} {{a}}', { a: '"<' }), '"\\"<" &quot;&lt; "<');
  assert.throws(() => fill("{{nope}}", {}), SettingsError);
});

test("consumer writes the project files to disk", () => {
  const directory = mkdtempSync(join(tmpdir(), "apple-host-"));
  const { written, message } = buildProject(directory, settings, options);
  assert.ok(written.includes("project.yml"));
  assert.match(message, /^Apple project written/);
  assert.equal(readFileSync(join(directory, "project.yml"), "utf8"), all["project.yml"]);
  writeApple(directory, { "Extra/File.txt": "x" });
});

test("settings.ts is rendered by aepm at install from every setting, each in a quoted string", { skip: !existsSync(new URL("../component.json", import.meta.url)) && "component.json is not in this copy" }, () => {
  const manifest = JSON.parse(readFileSync(new URL("../component.json", import.meta.url), "utf8"));
  assert.deepEqual(manifest.artefacts.find((item: { source: string }) => item.source === "implementation/apple/settings.ts"),
    { source: "implementation/apple/settings.ts", destination: "components/apple-host/apple/settings.ts", template: true, executable: false });
  const text = readFileSync(new URL("../implementation/apple/settings.ts", import.meta.url), "utf8");
  assert.deepEqual([...text.matchAll(/"\{\{([A-Za-z]+)\}\}"/g)].map((match) => match[1]), manifest.collect.map((item: { id: string }) => item.id));
});
