import SwiftUI

// Run time: the application's own entry point. The same code serves iPhone, iPad, Mac (Catalyst) and Apple TV.
@main
struct ExampleApp: App {
    var body: some Scene {
        ApplicationShell(ShellConfiguration(displayName: ShellSettings.current.displayName, tint: .orange, colourScheme: .dark)) {
            ExampleRoot()
        }
    }
}

struct ExampleRoot: View {
    var body: some View {
        Text(ShellSettings.current.displayName)
            .shellButtonStyle()
            .shellStatusBarHidden()
            .shellExitCommand { /* step back one level */ }
    }
}
