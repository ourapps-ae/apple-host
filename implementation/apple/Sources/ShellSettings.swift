import Foundation

// Values the generated project writes into Info.plist, read back at run time.
public struct ShellSettings: Equatable {
    public static let serverAddressKey = "ShellServerAddress"
    public static let overrideDefaultsKey = "serverURL"

    public let displayName: String
    public let bundleIdentifier: String
    public let serverAddress: String?

    // A value stored under `serverURL` in the defaults replaces the built-in address (for testing).
    public init(info: [String: Any], defaults: UserDefaults? = nil, fallbackName: String = "") {
        displayName = (info["CFBundleDisplayName"] as? String) ?? (info["CFBundleName"] as? String) ?? fallbackName
        bundleIdentifier = (info["CFBundleIdentifier"] as? String) ?? ""
        let built = (info[Self.serverAddressKey] as? String).flatMap { $0.isEmpty ? nil : $0 }
        serverAddress = defaults?.string(forKey: Self.overrideDefaultsKey).flatMap { $0.isEmpty ? nil : $0 } ?? built
    }

    public static var current: ShellSettings {
        ShellSettings(info: Bundle.main.infoDictionary ?? [:], defaults: .standard)
    }
}
