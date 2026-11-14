import SwiftUI

/// One screen below Settings, so the irreversible action isn't a row among
/// ordinary ones. Says what goes and what stays, then asks once more.
struct DeleteAccountView: View {
    @Environment(Session.self) private var session
    @State private var showConfirm = false
    @State private var isWorking = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            Group {
                Section {
                    Text("Your phone number and sign-in are removed from every team, and every device is signed out.")
                    Text("Your name stays on the rosters of the seasons you played, and your past responses stay with them.")
                } footer: {
                    Text("This can't be undone.")
                }

                Section {
                    Button("Delete Account", role: .destructive) {
                        showConfirm = true
                    }
                    .disabled(isWorking)
                }
            }
            .listRowBackground(AppTheme.surface)
        }
        .fixtureBackground()
        .navigationTitle("Delete Account")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Delete your account?", isPresented: $showConfirm, titleVisibility: .visible) {
            Button("Delete Account", role: .destructive) {
                Task { await deleteAccount() }
            }
        } message: {
            Text("This removes your phone number and sign-in from every team. This can't be undone.")
        }
        .alert("Couldn't Delete", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private func deleteAccount() async {
        isWorking = true
        defer { isWorking = false }
        do {
            try await session.deleteAccount()
        } catch {
            errorMessage = Session.explain(error)
        }
    }
}
