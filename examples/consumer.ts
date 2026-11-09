import { renderApple, writeApple, type AppleRenderOptions, type AppleShellSettings } from "../implementation/apple/render.ts";

// Build time: write the XcodeGen project, Info.plist files and export options for the chosen targets.
// Then run `xcodegen generate` in the directory. The application's own Swift sources live in <scheme>/Sources.
// Returns the files written and the render message (it says so when the targets name no Apple target and nothing is written).
export function buildProject(directory: string, settings: AppleShellSettings, options: AppleRenderOptions = {}): { written: string[]; message: string } {
  const { files, message } = renderApple(settings, options);
  writeApple(directory, files);
  return { written: Object.keys(files).sort(), message };
}
