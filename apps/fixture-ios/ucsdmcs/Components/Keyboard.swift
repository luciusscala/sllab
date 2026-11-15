import UIKit

/// Puts the keyboard away, whichever field has it.
///
/// SwiftUI drops a focused field's keyboard on a navigation push, but not
/// when the whole hierarchy is replaced, which is what happens the moment a
/// join completes and `ContentView` swaps the join flow for the team: the
/// number pad is left on screen with nothing behind it to dismiss it. Every
/// action that can end in that swap calls this first; the network round-trip
/// that follows gives the keyboard time to go before the views do.
enum Keyboard {
    @MainActor
    static func dismiss() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}
