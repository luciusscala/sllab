import SwiftUI

/// The six digits from the text. Verifying signs the person in; the join
/// then runs on its own, and only someone the team has never seen is asked
/// for anything more.
struct CodeEntryView: View {
    let context: JoinContext
    let phone: String
    @Binding var path: [JoinStep]
    @Environment(Session.self) private var session
    @State private var code = ""
    @State private var isVerifying = false
    @State private var isResending = false
    @State private var resent = false
    @State private var errorMessage: String?
    @FocusState private var isFocused: Bool

    private static let length = 6

    var body: some View {
        JoinPage(
            title: "Enter the Code",
            subtitle: "Sent to \(PhoneNumber.display(phone))",
            error: errorMessage
        ) {
            TextField("000000", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .font(.title.monospaced())
                .multilineTextAlignment(.center)
                .focused($isFocused)
                .joinField()
                .onChange(of: code) { _, value in
                    let digits = String(value.filter(\.isNumber).prefix(Self.length))
                    if digits != value { code = digits }
                    if digits.count == Self.length { Task { await verify() } }
                }

            JoinButton(title: "Verify", isLoading: isVerifying, isDisabled: code.count < Self.length) {
                Task { await verify() }
            }

            Button {
                Task { await resend() }
            } label: {
                if isResending {
                    ProgressView()
                } else {
                    Text(resent ? "Code sent again" : "Didn't get it? Send again")
                        .font(.subheadline)
                }
            }
            .disabled(isResending || resent || isVerifying)
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { isFocused = true }
    }

    private func verify() async {
        guard !isVerifying, code.count == Self.length else { return }
        isVerifying = true
        errorMessage = nil
        defer { isVerifying = false }
        do {
            try await session.verify(phone: phone, code: code)
            try await JoinFlowView.finish(context, session: session, path: $path)
        } catch {
            errorMessage = Session.explain(error)
            code = ""
        }
    }

    private func resend() async {
        isResending = true
        errorMessage = nil
        defer { isResending = false }
        do {
            try await session.sendCode(to: phone)
            resent = true
        } catch {
            errorMessage = Session.explain(error)
        }
    }
}
