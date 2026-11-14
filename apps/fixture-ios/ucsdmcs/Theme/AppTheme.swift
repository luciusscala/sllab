import SwiftUI

/// Fixture's colour scheme. There is one, dark, and the web app's
/// `apps/web/src/app/globals.css` defines the same values: change a colour in
/// both places together.
///
/// Colour has four jobs and nothing else: the ground, the one interactive
/// accent, meaning (availability), and picking the rarer event types out of
/// the schedule. Hierarchy within text comes from weight and size, not colour:
/// a row has one semibold white line and one regular grey one.
enum AppTheme {
    // MARK: Ground

    /// Behind every screen.
    static let background = Color(hex: 0x141619)
    /// Rows and cards, ruled off from the ground by `border`.
    static let surface = Color(hex: 0x22262B)
    /// Something on a surface: a field, a placeholder, a pressed row.
    static let surfaceRaised = Color(hex: 0x2D3238)
    /// A hairline around cards and between rows.
    static let border = Color.white.opacity(0.08)

    // MARK: Text

    static let text = Color.white
    static let textSecondary = Color(hex: 0xA3A9B1)

    // MARK: Accent

    /// The brightest thing on screen, so the eye lands on what's tappable:
    /// the primary button, links, the selected tab, toggles, checkmarks.
    static let accent = Color(hex: 0x3DDC84)
    /// Text on the accent. Dark, since the accent is light.
    static let onAccent = Color(hex: 0x0B1A10)

    // MARK: Meaning

    /// Going is the accent: one green, one meaning.
    static let going = accent
    static let notGoing = Color(hex: 0xFF453A)
    /// No response, away, and anything else that needs a look.
    static let warning = Color(hex: 0xFF9F0A)

    // MARK: Event types

    /// Practices are most of the schedule, so they get no colour; the
    /// exceptions do.
    static let game = Color(hex: 0xE0B034)
    static let social = Color(hex: 0xBF7AF0)
    static let tournament = Color(hex: 0x40C8E0)

    /// The colour that marks an event type in a list, or nil for the default.
    static func eventColor(_ eventType: String) -> Color? {
        switch eventType {
        case "game": return game
        case "social": return social
        case "tournament": return tournament
        default: return nil
        }
    }

    /// Cards and fields.
    static let cornerRadius: CGFloat = 12
}

extension Color {
    /// `Color(hex: 0x141619)`, so the values read the same as the CSS.
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

    /// A card: content on the surface colour with a hairline edge.
    func card() -> some View {
        background(AppTheme.surface, in: .rect(cornerRadius: AppTheme.cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
                    .strokeBorder(AppTheme.border)
            )
    }

    /// A text field or similar input, raised off its card.
    func field() -> some View {
        background(AppTheme.surfaceRaised, in: .rect(cornerRadius: AppTheme.cornerRadius))
    }

    /// The main action on a screen: a filled accent button with dark text.
    func primaryButton() -> some View {
        buttonStyle(.borderedProminent)
            .tint(AppTheme.accent)
            .foregroundStyle(AppTheme.onAccent)
    }

    /// A row that does something ordinary and reversible, like signing out
    /// or taking a break: white, like the text around it. The accent is for
    /// the one action a screen is there for, and red for the ones that
    /// take something away.
    func neutralAction() -> some View {
        foregroundStyle(AppTheme.text)
    }

    /// A small label that names a group or a type: uppercase, tracked, quiet.
    func sectionLabel(_ color: Color = AppTheme.textSecondary) -> some View {
        font(.caption.weight(.semibold))
            .textCase(.uppercase)
            .kerning(0.6)
            .foregroundStyle(color)
    }
}
