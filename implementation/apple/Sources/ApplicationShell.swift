import SwiftUI

public struct ShellConfiguration {
    public var displayName: String
    public var tint: Color
    // nil follows the system.
    public var colourScheme: ColorScheme?
    public var becameActive: () -> Void
    public var wentToBackground: () -> Void

    public init(displayName: String, tint: Color = .accentColor, colourScheme: ColorScheme? = nil,
                becameActive: @escaping () -> Void = {}, wentToBackground: @escaping () -> Void = {}) {
        self.displayName = displayName
        self.tint = tint
        self.colourScheme = colourScheme
        self.becameActive = becameActive
        self.wentToBackground = wentToBackground
    }
}

// The one window of the application, the same on iPhone, iPad, Mac (Catalyst) and Apple TV.
// The application declares its own `@main App` whose body is `ApplicationShell(...) { RootView() }`.
public struct ApplicationShell<Root: View>: Scene {
    private let configuration: ShellConfiguration
    private let root: () -> Root

    public init(_ configuration: ShellConfiguration, @ViewBuilder root: @escaping () -> Root) {
        self.configuration = configuration
        self.root = root
    }

    public var body: some Scene {
        WindowGroup(configuration.displayName) {
            ShellRoot(configuration: configuration, root: root)
        }
    }
}

struct ShellRoot<Root: View>: View {
    let configuration: ShellConfiguration
    let root: () -> Root
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        root()
            .preferredColorScheme(configuration.colourScheme)
            .tint(configuration.tint)
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { configuration.becameActive() } else if phase == .background { configuration.wentToBackground() }
            }
    }
}
