# Apple host instructions

## For the agent
Select `ourapps-ae/apple-host` when the recipe's targets include any of ios, macos or tvos. Set `targets` to the recipe's client target list (`$answer` of the targets question, for example `web ios android macos windows tvos`); the component keeps the Apple ones (ios gives iPhone and iPad, macos gives Mac, tvos gives Apple TV) and ignores the rest. Connect the `theme` requirement so the application can pass its accent colour to `ShellConfiguration`. Set `bundleIdentifier`, `displayName`, `scheme` and optionally `deploymentTargets`.

- Select package `ourapps-ae/apple-host` version `0.5.1`.
- Settings to configure:
  - `bundleIdentifier` (string, qualified; required)
  - `displayName` (string, label; required)
  - `targets` (string, label; optional; default `web ios android macos windows tvos`)
  - `deploymentTargets` (string, label; optional; default `ios17 tvos17 macos14`)
  - `scheme` (string, identifier; required)
- Connect the provided `apple-shell` (ae/apple-shell 1.0.0) to the consumer that needs it.
- Supply `theme` (ae/theme 1.0.0) from the component that provides it.
- No accounts or keys are needed.

## For the developer

- Theme: the `theme` port is described in `interfaces/required-theme.json`; feed theme `ThemeSet.accent` into the `ShellConfiguration.tint`. The theme document is the theme component's own; the provided interface `interfaces/apple-shell.json` is an OpenRPC 1.3.2 document.
Supply an Apple developer team and App Store Connect access by reference to the release pipeline, not to this component. Provide the application icon catalogue and Apple TV images (the component ships only the catalogue structure), the application's Swift sources and its Localizable resources. Run the render step, then `xcodegen generate`, then build with Xcode. To check, run the commands below; opening the generated project in Xcode is the real test.

## How to check
From the component directory:

- `node --test tests/render.test.ts` (render, required-local; tools: node 26.5)
- `python3 tests/native.py apple` (apple, platform; tools: python3 3.12, swiftc 6.4)
- `python3 tests/native.py project` (project, platform; tools: python3 3.12, node 26.5, xcodegen 2.46)
- `python3 -m aepm review <digest> --store STORE --policy POLICY --trusted --allow-network` checks an archive fetched with `python3 -m aepm fetch ourapps-ae/apple-host@VERSION --store STORE --from https://ourapps.app` and runs its suites.
