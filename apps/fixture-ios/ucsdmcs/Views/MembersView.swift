import SwiftUI

/// Who's on the team, for captains and coaches: new joins to confirm, the
/// staff, the players, who's gone quiet, and numbers added ahead of time.
struct MembersView: View {
    let membership: Membership
    @Environment(DataService.self) private var dataService
    @State private var invitePhone = ""
    @State private var inviteRole: Role = .player
    @State private var isInviting = false
    @State private var busyMember: UUID?
    @State private var errorMessage: String?

    private var open: [TeamMember] { dataService.members.filter { $0.status != .inactive } }
    private var newMembers: [TeamMember] { open.filter { $0.isNew && $0.role != .guest } }
    private var staff: [TeamMember] { open.filter { $0.role.isStaff && !$0.isNew } }
    private var players: [TeamMember] { open.filter { $0.role == .player && !$0.isNew } }
    private var guestCount: Int { open.filter { $0.role == .guest }.count }
    private var quiet: [RosterEntry] { dataService.quietPlayers() }

    var body: some View {
        NavigationStack {
            List {
                if !newMembers.isEmpty {
                    newSection
                }
                staffSection
                playersSection
                if !quiet.isEmpty {
                    quietSection
                }
                inviteSection
                if !dataService.invites.isEmpty {
                    pendingSection
                }
                if guestCount > 0 {
                    Section {
                        Text("\(guestCount) \(guestCount == 1 ? "guest is" : "guests are") following the schedule.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Members")
            .scrollDismissesKeyboard(.immediately)
            .refreshable { await load() }
            .task { await load() }
            .alert("Couldn't Save", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    // MARK: - Sections

    private var newSection: some View {
        Section {
            ForEach(newMembers) { member in
                HStack {
                    memberLabel(member)
                    Spacer()
                    if busyMember == member.id {
                        ProgressView()
                    } else {
                        Button("Keep") {
                            Task { await act(member) { try await dataService.reviewMember(member, keep: true) } }
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                        Button("Remove", role: .destructive) {
                            Task { await act(member) { try await dataService.reviewMember(member, keep: false) } }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                }
                .buttonStyle(.plain)
            }
        } header: {
            Text("New Members")
        } footer: {
            Text("Joined with the team code. Keep them or take them off the roster.")
        }
    }

    private var staffSection: some View {
        Section("Staff") {
            ForEach(staff) { member in
                memberRow(member)
            }
        }
    }

    private var playersSection: some View {
        Section("Players (\(players.count))") {
            if players.isEmpty {
                Text("No players yet. Share the team code.")
                    .foregroundStyle(.secondary)
            }
            ForEach(players) { member in
                memberRow(member)
            }
        }
    }

    private var quietSection: some View {
        Section {
            ForEach(quiet) { entry in
                HStack {
                    if let num = entry.number {
                        Text("#\(num)")
                            .font(.subheadline.monospaced().weight(.semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 36, alignment: .trailing)
                    }
                    Text(entry.displayName)
                    Spacer()
                    if let member = open.first(where: { $0.personId == entry.personId }) {
                        if busyMember == member.id {
                            ProgressView()
                        } else {
                            Button("Mark Away") {
                                Task { await act(member) { try await dataService.setStatus(.away, for: member) } }
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                    }
                }
            }
        } header: {
            Text("Haven't Been Around")
        } footer: {
            Text("No response to the last 8 events. Marking someone away keeps their spot but stops the reminders.")
        }
    }

    private var inviteSection: some View {
        Section {
            TextField("Phone number", text: $invitePhone)
                .keyboardType(.phonePad)
                .textContentType(.telephoneNumber)
            Picker("Role", selection: $inviteRole) {
                Text("Player").tag(Role.player)
                if membership.isCaptain {
                    Text("Captain").tag(Role.captain)
                    Text("Coach").tag(Role.coach)
                }
            }
            Button {
                Task { await invite() }
            } label: {
                HStack {
                    Text("Add")
                    Spacer()
                    if isInviting { ProgressView() }
                }
            }
            .disabled(PhoneNumber.e164(from: invitePhone) == nil || isInviting)
        } header: {
            Text("Add by Phone")
        } footer: {
            Text("When this number signs in with the team code, they'll already be on the team with this role.")
        }
    }

    private var pendingSection: some View {
        Section("Waiting to Sign In") {
            ForEach(dataService.invites) { invite in
                HStack {
                    Text(PhoneNumber.display(invite.phone))
                        .monospacedDigit()
                    Spacer()
                    Text(invite.role.label)
                        .foregroundStyle(.secondary)
                }
                .swipeActions {
                    Button("Cancel", role: .destructive) {
                        Task {
                            do { try await dataService.cancelInvite(invite) }
                            catch { errorMessage = Session.explain(error) }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Rows

    private func memberLabel(_ member: TeamMember) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(member.name)
                .foregroundStyle(member.status == .away ? .secondary : .primary)
            HStack(spacing: 6) {
                if member.role != .player {
                    Text(member.role.label)
                }
                if member.status == .away {
                    Text("Away")
                        .foregroundStyle(AppTheme.availabilityAmber)
                }
                if member.personId == membership.personId {
                    Text("You")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
    }

    private func memberRow(_ member: TeamMember) -> some View {
        HStack {
            memberLabel(member)
            Spacer()
            if busyMember == member.id {
                ProgressView()
            } else if mayManage(member) {
                Menu {
                    actions(for: member)
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    /// Coaches manage players; captains manage everyone, roles included.
    /// The database holds the same line, so this only hides what would fail.
    private func mayManage(_ member: TeamMember) -> Bool {
        let isSelf = member.personId == membership.personId
        return !isSelf && (membership.isCaptain || !member.role.isStaff)
    }

    @ViewBuilder
    private func actions(for member: TeamMember) -> some View {
        if member.status == .away {
            Button {
                Task { await act(member) { try await dataService.setStatus(.active, for: member) } }
            } label: { Label("Mark Active", systemImage: "checkmark.circle") }
        } else {
            Button {
                Task { await act(member) { try await dataService.setStatus(.away, for: member) } }
            } label: { Label("Mark Away", systemImage: "moon.zzz") }
        }

        if membership.isCaptain {
            Menu {
                ForEach([Role.player, .captain, .coach].filter { $0 != member.role }, id: \.self) { role in
                    Button("Make \(role.label)") {
                        Task { await act(member) { try await dataService.setRole(role, for: member) } }
                    }
                }
            } label: { Label("Change Role", systemImage: "person.badge.key") }
        }

        Button(role: .destructive) {
            Task { await act(member) { try await dataService.setStatus(.inactive, for: member) } }
        } label: { Label("Remove from Team", systemImage: "person.badge.minus") }
    }

    // MARK: - Actions

    private func load() async {
        await dataService.fetchMembers()
        await dataService.fetchInvites()
        if !dataService.hasLoadedDashboard {
            if dataService.currentSeason == nil { await dataService.fetchCurrentSeason() }
            await dataService.loadDashboard()
        }
    }

    private func act(_ member: TeamMember, _ work: () async throws -> Void) async {
        busyMember = member.id
        defer { busyMember = nil }
        do {
            try await work()
        } catch {
            errorMessage = Session.explain(error)
        }
    }

    private func invite() async {
        guard let phone = PhoneNumber.e164(from: invitePhone) else { return }
        isInviting = true
        defer { isInviting = false }
        do {
            try await dataService.invite(phone: phone, role: inviteRole)
            invitePhone = ""
            inviteRole = .player
        } catch {
            errorMessage = Session.explain(error)
        }
    }
}
