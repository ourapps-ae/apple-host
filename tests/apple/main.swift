import Foundation
import SwiftUI

var checks = 0
func check(_ condition: Bool, _ message: String, line: Int = #line) {
    checks += 1
    if !condition {
        FileHandle.standardError.write(Data("failed at line \(line): \(message)\n".utf8))
        exit(1)
    }
}

let data = try Data(contentsOf: URL(fileURLWithPath: "tests/fixtures/platform-traits.json"))
let expected = try JSONSerialization.jsonObject(with: data) as! [String: [String: Bool]]
check(Set(expected.keys) == Set(PlatformFamily.allCases.map(\.rawValue)), "fixture lists every family")
for family in PlatformFamily.allCases {
    let want = expected[family.rawValue]!
    let got = PlatformTraits.traits(for: family)
    check(got.uprightBoard == want["uprightBoard"], "\(family) uprightBoard")
    check(got.hidesStatusBar == want["hidesStatusBar"], "\(family) hidesStatusBar")
    check(got.usesFocusNavigation == want["usesFocusNavigation"], "\(family) usesFocusNavigation")
    check(got.showsCornerHelp == want["showsCornerHelp"], "\(family) showsCornerHelp")
    check(got.capitalisesTypedNames == want["capitalisesTypedNames"], "\(family) capitalisesTypedNames")
    check(got.plainButtons == want["plainButtons"], "\(family) plainButtons")
    check(got.handlesExitCommand == want["handlesExitCommand"], "\(family) handlesExitCommand")
}

// This check runs as a macOS program.
check(Platform.family == .mac, "family on the test machine")
check(Platform.uprightBoard, "upright board follows the family")
check(Platform.traits == PlatformTraits.traits(for: .mac), "current traits")

let info: [String: Any] = ["CFBundleDisplayName": "Example App", "CFBundleName": "Example", "CFBundleIdentifier": "app.example.app", "ShellServerAddress": "https://server.example.com"]
let settings = ShellSettings(info: info)
check(settings.displayName == "Example App", "display name")
check(settings.bundleIdentifier == "app.example.app", "bundle identifier")
check(settings.serverAddress == "https://server.example.com", "built-in server address")
check(ShellSettings(info: ["CFBundleName": "Only"]).displayName == "Only", "falls back to bundle name")
check(ShellSettings(info: [:], fallbackName: "Fallback").displayName == "Fallback", "falls back to the given name")
check(ShellSettings(info: ["ShellServerAddress": ""]).serverAddress == nil, "empty address is none")

let suite = "apple-host-test-\(ProcessInfo.processInfo.processIdentifier)"
let defaults = UserDefaults(suiteName: suite)!
defer { defaults.removePersistentDomain(forName: suite) }
check(ShellSettings(info: info, defaults: defaults).serverAddress == "https://server.example.com", "no override keeps the built-in address")
defaults.set("http://localhost:8787", forKey: ShellSettings.overrideDefaultsKey)
check(ShellSettings(info: info, defaults: defaults).serverAddress == "http://localhost:8787", "override replaces the address")

var active = 0
let configuration = ShellConfiguration(displayName: "Example App", tint: .orange, colourScheme: .dark, becameActive: { active += 1 })
configuration.becameActive()
check(active == 1 && configuration.colourScheme == .dark && configuration.displayName == "Example App", "configuration keeps its values")
let scene = ApplicationShell(configuration) { Text("Root").shellButtonStyle().shellNameInput().shellStatusBarHidden().shellExitCommand {} }
_ = scene

print("\(checks) apple-host assertions passed")
