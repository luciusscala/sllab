import SwiftUI

/// Where everyone starts: the team code from a captain. Also the way back
/// onto a team the person left, and the way out of an account with no team.
struct TeamCodeView: View {
    @Binding var path: [JoinStep]
    @Environment(Session.self) private var session
    @State private var teamCode = ""
    @State private var isLoading = false
    @State private var rejoining: UUID?
    @State private var errorMessage: String?

    var body: some View {
        JoinPage(
            title: "Join Your Team",
            subtitle: "Enter the team code from your captain",
            error: errorMessage
        ) {
            TextField("Team Code", text: $teamCode)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .font(.title3.monospaced())
                .multilineTextAlignment(.center)
                .submitLabel(.continue)
                .onSubmit { Task { await lookUp() } }
                .joinField()

            JoinButton(title: "Continue", isLoading: isLoading, isDisabled: trimmedCode.isEmpty) {
                Task { await lookUp() }
            }

            if !session.left.isEmpty {
                leftTeams
            }
        }
        .safeAreaInset(edge: .bottom) {
            if session.state == .signedIn {
                accountFooter
            }
        }
    }

    private var trimmedCode: String {
        teamCode.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Teams you left

    private var leftTeams: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Teams you left")
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)
                .padding(.top, 8)

            ForEach(session.left) { membership in
                HStack {
                    Text(membership.teamName)
                        .lineLimit(1)
                    Spacer()
                    Button {
                        Task { await rejoin(membership) }
                    } label: {
                        if rejoining == membership.id {
                            ProgressView()
                        } else {
                            Text("Rejoin")
                                .font(.subheadline.weight(.semibold))
                        }
                    }
                    .buttonStyle(.bordered)
                    .disabled(rejoining != nil)
                }
                .padding(12)
                .field()
            }
        }
    }

    // MARK: - Signed in, no team

    private var accountFooter: some View {
        VStack(spacing: 4) {
            if let phone = session.phone {
                Text("Signed in as \(PhoneNumber.display(phone))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Button("Sign Out") {
                Task { await session.signOut() }
            }
            .font(.caption.weight(.medium))
        }
        .padding(.bottom, 8)
    }

    // MARK: - Actions

    private func lookUp() async {
        guard !trimmedCode.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            if let team = try await session.lookupTeam(code: trimmedCode) {
                path.append(.who(JoinContext(team: team, code: trimmedCode)))
            } else {
                errorMessage = "That team code isn't right. Check it with your captain."
            }
        } catch {
            errorMessage = Session.explain(error)
        }
    }

    private func rejoin(_ membership: Membership) async {
        rejoining = membership.id
        errorMessage = nil
        defer { rejoining = nil }
        do {
            try await session.setMyStatus(.active, membership: membership)
        } catch {
            errorMessage = Session.explain(error)
        }
    }
}
