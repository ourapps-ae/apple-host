# Apple host component

## Purpose and facilities
One SwiftUI application for iPhone, iPad, Mac (Catalyst) and Apple TV, with the platform differences handled once. The Swift side supplies the shared window (`ApplicationShell`), a table of what each device family does differently (`PlatformTraits`), view modifiers for the calls that differ between platforms, and the settings the project writes into Info.plist. The build side renders the XcodeGen `project.yml`, the iPhone/iPad/Mac and Apple TV Info.plist files, the Mac sandbox entitlements, App Store export options and the Apple TV icon catalogue skeleton from typed settings.

Facilities: `apple-shell` (SwiftUI application shell for iPhone, iPad, Mac and Apple TV).

## User inputs
The installer collects these settings. `targets` takes the recipe's client target list, space-separated (default `web ios android macos windows tvos`): `ios` builds iPhone and iPad, `macos` builds Mac (Catalyst), `tvos` builds Apple TV, and `web`, `android` and `windows` are ignored. A list with no Apple target writes no Apple project; `renderApple` returns an empty `files` and a message saying so. A word that is neither an Apple nor a recipe target (for example `watch`) is refused. `deploymentTargets` is a space-separated list such as `ios17 tvos17 macos14` (major version; `ios17_2` for a minor version); the collected grammar cannot carry dots.

- `bundleIdentifier` (string, qualified; required)
- `displayName` (string, label; required)
- `targets` (string, label; optional; default `web ios android macos windows tvos`)
- `deploymentTargets` (string, label; optional; default `ios17 tvos17 macos14`)
- `scheme` (string, identifier; required)

## Artefacts and dependencies
`component.json` maps every `implementation/` source into `components/apple-host/`:

- `implementation/apple/Sources/ApplicationShell.swift` -> `components/apple-host/apple/Sources/ApplicationShell.swift`
- `implementation/apple/Sources/Platform.swift` -> `components/apple-host/apple/Sources/Platform.swift`
- `implementation/apple/Sources/ShellSettings.swift` -> `components/apple-host/apple/Sources/ShellSettings.swift`
- `implementation/apple/render.ts` -> `components/apple-host/apple/render.ts`
- `implementation/apple/templates/ExportOptions.plist.template` -> `components/apple-host/apple/templates/ExportOptions.plist.template`
- `implementation/apple/templates/Info.plist.template` -> `components/apple-host/apple/templates/Info.plist.template`
- `implementation/apple/templates/InfoTV.plist.template` -> `components/apple-host/apple/templates/InfoTV.plist.template`
- `implementation/apple/templates/MacCatalyst.entitlements` -> `components/apple-host/apple/templates/MacCatalyst.entitlements`
- `implementation/apple/templates/app-target.yml.template` -> `components/apple-host/apple/templates/app-target.yml.template`
- `implementation/apple/templates/mac-settings.yml.template` -> `components/apple-host/apple/templates/mac-settings.yml.template`
- `implementation/apple/templates/project.yml.template` -> `components/apple-host/apple/templates/project.yml.template`
- `implementation/apple/templates/scheme.yml.template` -> `components/apple-host/apple/templates/scheme.yml.template`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Shelf.imageset/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Shelf.imageset/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Small.imagestack/Artwork.imagestacklayer/Content.imageset/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Small.imagestack/Artwork.imagestacklayer/Content.imageset/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Small.imagestack/Artwork.imagestacklayer/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Small.imagestack/Artwork.imagestacklayer/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Small.imagestack/Background.imagestacklayer/Content.imageset/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Small.imagestack/Background.imagestacklayer/Content.imageset/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Small.imagestack/Background.imagestacklayer/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Small.imagestack/Background.imagestacklayer/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Small.imagestack/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Small.imagestack/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Store.imagestack/Artwork.imagestacklayer/Content.imageset/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Store.imagestack/Artwork.imagestacklayer/Content.imageset/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Store.imagestack/Artwork.imagestacklayer/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Store.imagestack/Artwork.imagestacklayer/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Store.imagestack/Background.imagestacklayer/Content.imageset/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Store.imagestack/Background.imagestacklayer/Content.imageset/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Store.imagestack/Background.imagestacklayer/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Store.imagestack/Background.imagestacklayer/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Store.imagestack/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Store.imagestack/Contents.json`
- `implementation/apple/templates/tv-assets/AppIcon.brandassets/Wide.imageset/Contents.json` -> `components/apple-host/apple/templates/tv-assets/AppIcon.brandassets/Wide.imageset/Contents.json`
- `implementation/apple/templates/tv-assets/Contents.json` -> `components/apple-host/apple/templates/tv-assets/Contents.json`
- `implementation/apple/templates/tv-target.yml.template` -> `components/apple-host/apple/templates/tv-target.yml.template`

Dependencies: none.
`tools.lock.json` pins verification tools: node 26.5.0, python3 3.12.8, swiftc 6.4.2, xcodegen 2.46.0. Licence wording remains deferred.

## Provided interfaces
- `interfaces/apple-shell.json` defines `apple-shell` (ae/apple-shell) version 1.0.0.

## Required interfaces
- `theme` (ae/theme) version 1.0.0, supplied by the recipe or application. The operations used are listed in `interfaces/required/theme.json`: theme `ThemeSet.accent` for the shell tint.

## Integration
Render the project with `renderApple(settings, options)` from `apple/render.ts`, which returns `{files, message}`, and write `files` with `writeApple` into the Apple project folder, then run `xcodegen generate`. When `files` is empty the targets named no Apple target and `message` says so. `options.componentSources` lists the `apple/Sources` folders of the other components compiled into the application; `options.packages` lists Swift packages. The application keeps its own sources under `<scheme>/Sources`, resources under `<scheme>/Resources` and the Apple TV images in `<scheme>TV/Assets.xcassets`. In the application's `@main App` return `ApplicationShell(ShellConfiguration(...)) { RootView() }`; ask `Platform.traits` for device differences and use `shellStatusBarHidden`, `shellNameInput`, `shellButtonStyle` and `shellExitCommand` where the API differs. `ShellSettings.current` reads the display name and server address that the generated project writes into Info.plist. `examples/consumer.ts` and `examples/Application.swift` show both halves.

## Visual definition and connected examples
`visual/definition.json` maps its ports to the provided and required interfaces. `visual/examples/connected.json` connects the component to an illustrative application consumer. Both image formats and a text description are in `visual/output/`.

## Infrastructure
No service is deployed. Building needs a Mac with Xcode and XcodeGen; signing and App Store Connect belong to the release pipeline. Team and profile names reach the project through environment variables named after the scheme (`<SCHEME>_TEAM`, `<SCHEME>_PROFILE`, `<SCHEME>_TV_PROFILE`), supplied by reference at release time; no signing material is stored here. Export option files hold the placeholders `TEAM_ID` and `PROFILE_NAME` for the pipeline to replace.

## Verification
`node --test tests/render.test.ts` renders the fixture application for every target combination and checks the project, property lists, export options and asset skeleton. `python3 tests/native.py apple` compiles the Swift host sources with swiftc 6.4.2 against the fixture traits table and settings cases, and type-checks the example entry point. `python3 tests/native.py project` renders the fixture into a project folder, runs XcodeGen 2.46.0 on it and checks the generated Xcode project and the property lists with plutil. The project was not built with xcodebuild, and nothing ran on a device or simulator.

- `node --test tests/render.test.ts` (render, required-local; tools: node 26.5.0)
- `python3 tests/native.py apple` (apple, platform; tools: python3 3.12.8, swiftc 6.4.2)
- `python3 tests/native.py project` (project, platform; tools: python3 3.12.8, node 26.5.0, xcodegen 2.46.0)

## Scenarios and presentation
iPhone and iPad share one target and run portrait or all orientations; Mac runs the same target as Mac Catalyst with the sandbox entitlements and an upright board; Apple TV is a second target with focus navigation, the remote Menu button as exit command and no corner help control.

## Updates and removal
Patch updates replace the owned files; regenerate the project after each update. Removal deletes the owned sources and the generated project folder entries; the application's own sources are untouched. No application data is held.
