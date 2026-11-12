import SwiftUI

/// "Are you on the team, or just looking?" A player signs in with their
/// phone so the roster knows them; a guest gets the schedule and nothing
/// else, with no number asked.
struct WhoView: View {
    let context: JoinContext
    @Binding var path: [JoinStep]
    @Environment(Session.self) private var session
    @State private var isJoining = false
    @State private var isBrowsing = false
    @State private var errorMessage: String?

    /// Someone already signed in with a phone is already a person; they
    /// skip the phone screens and go straight onto the team.
    private var hasPhone: Bool {
        session.state == .signedIn && !session.isAnonymous && session.phone != nil
    }

    var body: some View {
        JoinPage(
            title: context.team.name,
            subtitle: hasPhone ? "Join as \(PhoneNumber.display(session.phone ?? ""))?" : "Are you on the team?",
            error: errorMessage
        ) {
            TeamBadge(team: context.team)
                .padding(.bottom, 8)

            JoinButton(title: hasPhone ? "Join Team" : "I'm on the team", isLoading: isJoining, isDisabled: isBrowsing) {
                if hasPhone {
                    Task { await joinAsMyself() }
                } else {
                    path.append(.phone(context))
                }
            }

            if !hasPhone {
                Button {
                    Task { await browse() }
                } label: {
                    Group {
                        if isBrowsing {
                            ProgressView()
                        } else {
                            Text("Just looking")
                                .font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.bordered)
                .disabled(isJoining || isBrowsing)

                Text("Guests can see the schedule but can't respond to events.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func joinAsMyself() async {
        isJoining = true
        errorMessage = nil
        defer { isJoining = false }
        do {
            try await JoinFlowView.finish(context, session: session, path: $path)
        } catch {
            errorMessage = Session.explain(error)
        }
    }

    private func browse() async {
        isBrowsing = true
        errorMessage = nil
        defer { isBrowsing = false }
        do {
            if !(session.state == .signedIn && session.isAnonymous) {
                try await session.signInAsGuest()
            }
            _ = try await session.join(code: context.code)
        } catch {
            errorMessage = Session.explain(error)
        }
    }
}
