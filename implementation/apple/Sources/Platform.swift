import SwiftUI

// One place for the differences between iPhone, iPad, Mac (Catalyst) and Apple TV.

public enum PlatformFamily: String, CaseIterable {
    case phone, pad, mac, tv
}

// What each family does differently, as data so every screen asks one question.
public struct PlatformTraits: Equatable {
    // The board and name plates stay upright instead of rotating toward the viewer.
    public let uprightBoard: Bool
    public let hidesStatusBar: Bool
    // Moves with the focus engine and a remote, not touches or a pointer.
    public let usesFocusNavigation: Bool
    // A help control can sit in a screen corner; on tv the remote reaches help another way.
    public let showsCornerHelp: Bool
    public let capitalisesTypedNames: Bool
    public let plainButtons: Bool
    // The Menu button on the remote steps back one level.
    public let handlesExitCommand: Bool

    public static func traits(for family: PlatformFamily) -> PlatformTraits {
        let tv = family == .tv
        return PlatformTraits(
            uprightBoard: family == .mac || tv,
            hidesStatusBar: !tv,
            usesFocusNavigation: tv,
            showsCornerHelp: !tv,
            capitalisesTypedNames: !tv,
            plainButtons: !tv,
            handlesExitCommand: tv)
    }
}

public enum Platform {
    public static var family: PlatformFamily {
        #if os(tvOS)
        .tv
        #elseif targetEnvironment(macCatalyst) || os(macOS)
        .mac
        #elseif canImport(UIKit)
        UIDevice.current.userInterfaceIdiom == .pad ? .pad : .phone
        #else
        .phone
        #endif
    }

    public static var traits: PlatformTraits { PlatformTraits.traits(for: family) }
    public static var uprightBoard: Bool { traits.uprightBoard }
}

public extension View {
    @ViewBuilder func shellStatusBarHidden() -> some View {
        #if os(iOS)
        statusBarHidden(true)
        #else
        self
        #endif
    }

    @ViewBuilder func shellNameInput() -> some View {
        #if os(iOS)
        textFieldStyle(.roundedBorder).textInputAutocapitalization(.words)
        #elseif os(macOS)
        textFieldStyle(.roundedBorder)
        #else
        self
        #endif
    }

    @ViewBuilder func shellButtonStyle() -> some View {
        #if os(tvOS)
        buttonStyle(.bordered)
        #else
        buttonStyle(.plain)
        #endif
    }

    // The remote's Menu button; other platforms have no such command.
    @ViewBuilder func shellExitCommand(_ action: @escaping () -> Void) -> some View {
        #if os(tvOS)
        onExitCommand(perform: action)
        #else
        self
        #endif
    }
}
