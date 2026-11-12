import SwiftUI

/// Asks for the phone number and sends the code. The number is the account:
/// it's how the roster recognises a returning player and how reminders
/// reach them.
struct PhoneSignInView: View {
    let context: JoinContext
    @Binding var path: [JoinStep]
    @Environment(Session.self) private var session
    @State private var phone = ""
    @State private var isSending = false
    @State private var errorMessage: String?
    @FocusState private var isFocused: Bool

    private var e164: String? { PhoneNumber.e164(from: phone) }

    var body: some View {
        JoinPage(
            title: "Your Phone Number",
            subtitle: "We'll text you a code to sign in",
            error: errorMessage
        ) {
            TextField("(555) 555-0100", text: $phone)
                .keyboardType(.phonePad)
                .textContentType(.telephoneNumber)
                .font(.title3.monospaced())
                .multilineTextAlignment(.center)
                .focused($isFocused)
                .joinField()
                .onChange(of: phone) { _, value in
                    let digits = value.filter(\.isNumber)
                    if digits.count > 11 { phone = String(digits.prefix(11)) }
                }

            JoinButton(title: "Send Code", isLoading: isSending, isDisabled: e164 == nil) {
                Task { await send() }
            }

            Text("Standard message and data rates may apply. Your number is only used to sign you in and, if you choose, for team reminders.")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { isFocused = true }
    }

    private func send() async {
        guard let e164 else { return }
        isSending = true
        errorMessage = nil
        defer { isSending = false }
        do {
            try await session.sendCode(to: e164)
            path.append(.code(context, phone: e164))
        } catch {
            errorMessage = Session.explain(error)
        }
    }
}
