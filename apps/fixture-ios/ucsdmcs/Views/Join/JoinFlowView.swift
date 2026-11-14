import SwiftUI

/// The team being joined, carried from the code screen to the end.
struct JoinContext: Hashable {
    let team: TeamSummary
    let code: String
}

/// The screens after the team code, in the order they can appear. Which
/// ones a person sees depends on who they are: a guest sees none, a known
/// number stops at the code, a new player goes all the way to the profile.
enum JoinStep: Hashable {
    case who(JoinContext)
    case phone(JoinContext)
    case code(JoinContext, phone: String)
    case profile(JoinContext)
}

/// Getting onto a team: code, who you are, phone, and for someone new, a
/// profile. Shown whenever there's no team to show, so it also offers to
/// rejoin a team the person left. The moment a membership exists,
/// `ContentView` swaps this out for the team.
struct JoinFlowView: View {
    @State private var path: [JoinStep] = []

    var body: some View {
        NavigationStack(path: $path) {
            TeamCodeView(path: $path)
                .navigationDestination(for: JoinStep.self) { step in
                    switch step {
                    case .who(let context):
                        WhoView(context: context, path: $path)
                    case .phone(let context):
                        PhoneSignInView(context: context, path: $path)
                    case .code(let context, let phone):
                        CodeEntryView(context: context, phone: phone, path: $path)
                    case .profile(let context):
                        ProfileView(context: context)
                    }
                }
        }
    }

    /// Joins as whoever is signed in. If the database wants a profile
    /// first, moves on to that screen; otherwise the join is complete and
    /// the session now has a team.
    @MainActor
    static func finish(_ context: JoinContext, session: Session, path: Binding<[JoinStep]>) async throws {
        let result = try await session.join(code: context.code)
        if result.needsProfile {
            path.wrappedValue.append(.profile(context))
        }
    }
}

// MARK: - Shared pieces

/// The layout every join screen uses: a title, a line under it, the
/// controls, and room for an error.
struct JoinPage<Content: View>: View {
    let title: String
    let subtitle: String
    var error: String?
    @ViewBuilder let content: Content

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            VStack(spacing: 8) {
                Text(title)
                    .font(.largeTitle.weight(.bold))
                    .multilineTextAlignment(.center)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 16) {
                content
            }
            .padding(.horizontal, 40)

            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(AppTheme.notGoing)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }

            Spacer()
            Spacer()
        }
        .padding()
        .fixtureBackground()
    }
}

/// A full-width primary button that shows a spinner while its work runs.
struct JoinButton: View {
    let title: String
    var isLoading = false
    var isDisabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Group {
                if isLoading {
                    ProgressView()
                } else {
                    Text(title)
                        .font(.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
        }
        .primaryButton()
        .disabled(isDisabled || isLoading)
    }
}

/// The text field style the join screens share.
struct JoinFieldStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(12)
            .background(AppTheme.surface, in: .rect(cornerRadius: AppTheme.cornerRadius))
    }
}

extension View {
    func joinField() -> some View { modifier(JoinFieldStyle()) }
}

/// A team's crest, or its initials while the image loads or if it has none.
struct TeamBadge: View {
    let team: TeamSummary
    var size: CGFloat = 72

    var body: some View {
        Group {
            if let path = team.logoPath, let url = SupabaseConfig.storageURL(for: path) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    initials
                }
            } else {
                initials
            }
        }
        .frame(width: size, height: size)
        .clipShape(.rect(cornerRadius: size / 5))
    }

    private var initials: some View {
        RoundedRectangle(cornerRadius: size / 5)
            .fill(AppTheme.accent)
            .overlay {
                Text(team.name.split(separator: " ").prefix(3).compactMap { $0.first.map { String($0) } }.joined())
                    .font(.system(size: size / 3, weight: .bold))
                    .foregroundStyle(AppTheme.text)
            }
    }
}
