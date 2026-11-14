import SwiftUI

struct SettingsView: View {
    let membership: Membership
    @Environment(Session.self) private var session
    @Environment(DataService.self) private var dataService
    @State private var editingHometown = ""
    @State private var isWorking = false
    @State private var showLeaveConfirm = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?
    @FocusState private var isHometownFocused: Bool

    /// This season's roster row, for the number.
    private var rosterEntry: RosterEntry? {
        guard let rosterId = membership.rosterId else { return nil }
        return dataService.roster.first { $0.id == rosterId }
    }

    /// The person, from the roster when they're on it and the member list
    /// otherwise (a coach has no roster row).
    private var person: Person? {
        rosterEntry?.people ?? dataService.members.first { $0.personId == membership.personId }?.people
    }

    private var otherTeams: [Membership] {
        session.memberships.filter { $0.teamId != membership.teamId && $0.status != .inactive }
    }

    var body: some View {
        NavigationStack {
            List {
                Group {
                    teamSection
                    if membership.role != .guest {
                        profileSection
                    }
                    if session.current?.isCaptain == true {
                        playerViewSection
                    }
                    if !otherTeams.isEmpty {
                        switchSection
                    }
                    accountSection
                }
                .listRowBackground(AppTheme.surface)
            }
            .fixtureBackground()
            .scrollDismissesKeyboard(.immediately)
            .navigationTitle("Settings")
            .disabled(isWorking)
            .confirmationDialog("Leave \(membership.teamName)?", isPresented: $showLeaveConfirm, titleVisibility: .visible) {
                Button("Leave Team", role: .destructive) {
                    Task { await run { try await session.setMyStatus(.inactive, membership: membership) } }
                }
            } message: {
                Text("You'll stop getting reminders and drop off the response lists. You can rejoin with the team code any time.")
            }
            .confirmationDialog("Delete your account?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete Account", role: .destructive) {
                    Task { await run { try await session.deleteAccount() } }
                }
            } message: {
                Text("This removes your phone number and sign-in from every team. Past roster and attendance records are kept. This can't be undone.")
            }
            .alert("Couldn't Save", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "")
            }
            .onChange(of: person?.hometown, initial: true) { _, hometown in
                editingHometown = hometown ?? ""
            }
        }
    }

    // MARK: - Team

    private var teamSection: some View {
        Section {
            row("Team", membership.teamName)
            row("Role", membership.role.label)
            if membership.status == .away {
                HStack {
                    Text("Status")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Away")
                        .foregroundStyle(.tertiary)
                }
                Button("I'm back") {
                    Task {
                        await run {
                            if membership.role.isOnRoster {
                                try await session.continueSeason()
                            } else {
                                try await session.setMyStatus(.active, membership: membership)
                            }
                        }
                    }
                }
            } else if membership.role.isOnRoster {
                Button("Take a break") {
                    Task { await run { try await session.setMyStatus(.away, membership: membership) } }
                }
                .foregroundStyle(.secondary)
            }
        } header: {
            Text("Team")
        } footer: {
            if membership.status == .away {
                Text("While you're away you're left out of response lists and reminders.")
            } else if membership.role.isOnRoster {
                Text("Taking a break keeps your spot but pauses reminders and response lists until you're back.")
            }
        }
    }

    // MARK: - Profile

    private var profileSection: some View {
        Section {
            row("Name", membership.personName)

            if let number = rosterEntry?.number {
                row("Number", "#\(number)")
            }

            if let phone = session.phone {
                row("Phone", PhoneNumber.display(phone))
            }

            HStack {
                Text("Hometown")
                    .foregroundStyle(.secondary)
                Spacer()
                TextField("Add hometown", text: $editingHometown)
                    .multilineTextAlignment(.trailing)
                    .focused($isHometownFocused)
                    .submitLabel(.done)
                    .onSubmit { Task { await saveHometown() } }
            }

            if editingHometown != (person?.hometown ?? "") {
                Button("Save Changes") {
                    Task { await saveHometown() }
                }
                .font(.body.weight(.medium))
            }
        } header: {
            Text("Profile")
        } footer: {
            Text("Ask a captain to change your name or number.")
        }
    }

    // MARK: - Player view

    /// Shown from the captain's real membership, so it stays reachable while
    /// the rest of the app is drawn as a player's.
    private var playerViewSection: some View {
        Section {
            Toggle("View as Player", isOn: Binding(
                get: { session.isViewingAsPlayer },
                set: { session.isViewingAsPlayer = $0 }
            ))
        } footer: {
            Text(session.isViewingAsPlayer
                 ? "You're seeing the app as players do. Your captain tools come back when you turn this off."
                 : "See the schedule and settings the way players do, without the captain tools.")
        }
    }

    // MARK: - Other teams

    private var switchSection: some View {
        Section("Switch Team") {
            ForEach(otherTeams) { other in
                Button {
                    session.select(teamId: other.teamId)
                } label: {
                    HStack {
                        Text(other.teamName)
                            .foregroundStyle(.primary)
                        Spacer()
                        Text(other.role.label)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
        }
    }

    // MARK: - Account

    private var accountSection: some View {
        Section {
            if membership.role == .guest {
                Button("Join as a player") {
                    // Guests have no number; signing out lands on the join
                    // flow, where "I'm on the team" asks for one.
                    Task { await session.signOut() }
                }
            }

            Button(role: .destructive) {
                showLeaveConfirm = true
            } label: {
                HStack {
                    Text("Leave Team")
                    Spacer()
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundStyle(AppTheme.notGoing)
                }
            }

            Button("Sign Out") {
                Task { await session.signOut() }
            }

            if !session.isAnonymous {
                Button("Delete Account", role: .destructive) {
                    showDeleteConfirm = true
                }
            }
        } header: {
            Text("Account")
        } footer: {
            if session.isAnonymous {
                Text("You're browsing as a guest.")
            }
        }
    }

    // MARK: - Helpers

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.trailing)
        }
    }

    private func saveHometown() async {
        guard let person else { return }
        isHometownFocused = false
        await dataService.updateHometown(personId: person.id, hometown: editingHometown)
        if let season = dataService.currentSeason {
            await dataService.fetchRoster(seasonId: season.id)
        }
        await dataService.fetchMembers()
    }

    private func run(_ work: () async throws -> Void) async {
        isWorking = true
        defer { isWorking = false }
        do {
            try await work()
        } catch {
            errorMessage = Session.explain(error)
        }
    }
}
