import SwiftUI

/// Fixture's colour scheme. There is one, dark, and the web app's
/// `apps/web/src/app/globals.css` defines the same values: change a colour in
/// both places together.
///
/// Colour carries meaning, not decoration. White text on charcoal, the pitch
/// green from the app icon for the few filled controls, and colour otherwise
/// only for availability and for picking games out of the schedule.
enum AppTheme {
    // MARK: Ground

    /// Behind every screen. Charcoal rather than black.
    static let background = Color(hex: 0x1C1F23)
    /// Rows, cards and fields.
    static let surface = Color(hex: 0x262A2F)
    /// Something sitting on a surface: a placeholder, a selected chip.
    static let surfaceRaised = Color(hex: 0x30353B)

    // MARK: Text

    static let text = Color.white
    static let textSecondary = Color(hex: 0xA3A9B1)

    // MARK: Accent

    /// The pitch green from the app icon. Filled buttons and switches, always
    /// with white on top; too dark to use as text on the background.
    static let accent = Color(hex: 0x356334)

    // MARK: Meaning

    static let going = Color(hex: 0x34C759)
    static let notGoing = Color(hex: 0xFF453A)
    /// No response, away, and anything else that needs a look.
    static let warning = Color(hex: 0xFF9F0A)
    static let game = Color(hex: 0xE0B034)

    /// The label colour for an event type: games stand out, everything else
    /// reads as plain text.
    static func eventColor(_ eventType: String) -> Color {
        eventType == "game" ? game : textSecondary
    }

    /// Cards and fields.
    static let cornerRadius: CGFloat = 12
}

extension Color {
    /// `Color(hex: 0x1C1F23)`, so the values read the same as the CSS.
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

extension View {
    /// The app's ground in place of the system's black, for a screen's
    /// outermost view: a list, form, scroll view or plain stack.
    func fixtureBackground() -> some View {
        frame(maxWidth: .infinity, maxHeight: .infinity)
            .scrollContentBackground(.hidden)
            .background(AppTheme.background)
    }

    /// Switches in the accent, since the app's tint is white.
    func accentSwitch() -> some View {
        tint(AppTheme.accent)
    }

    /// The main action on a screen: a filled pitch-green button.
    func primaryButton() -> some View {
        buttonStyle(.borderedProminent)
            .tint(AppTheme.accent)
    }
}
