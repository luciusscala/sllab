import Foundation

/// What a person is on a team. Captains sit on the roster and run the team;
/// coaches run it from the sideline; guests only look.
enum Role: String, Codable, Hashable, CaseIterable {
    case guest, player, captain, coach

    var label: String {
        switch self {
        case .guest: return "Guest"
        case .player: return "Player"
        case .captain: return "Captain"
        case .coach: return "Coach"
        }
    }

    var isStaff: Bool { self == .captain || self == .coach }
    var isOnRoster: Bool { self == .player || self == .captain }
}

/// Whether a member is around. A filter, never a response: someone away is
/// left out of the response lists and reminders rather than shown as silent.
enum MemberStatus: String, Codable, Hashable {
    case active, away, inactive

    var label: String {
        switch self {
        case .active: return "Active"
        case .away: return "Away"
        case .inactive: return "Left"
        }
    }
}

/// One row of `my_memberships()` or the `membership` half of `join_team()`:
/// the caller's own place on a team.
struct Membership: Identifiable, Codable, Hashable {
    let membershipId: UUID
    let teamId: UUID
    let teamName: String
    let teamLogo: String?
    let personId: UUID
    let personName: String
    let role: Role
    let status: MemberStatus
    let isNew: Bool
    /// This season's roster row for players and captains; nil for staff,
    /// guests, and a player who hasn't confirmed they're back this season.
    let rosterId: UUID?

    var id: UUID { membershipId }

    /// The same tests the database's `is_staff`, `is_captain` and
    /// `can_respond` make, for deciding what to show.
    var isStaff: Bool { role.isStaff && status == .active }
    var isCaptain: Bool { role == .captain && status == .active }
    var canRespond: Bool { role.isOnRoster && status == .active && rosterId != nil }
    /// A returning player not yet on this season's roster: ask them.
    var needsSeasonAnswer: Bool { role.isOnRoster && status == .active && rosterId == nil }

    /// The same place on the team with a player's role, for a captain
    /// checking what players see. Only the app's view changes; the database
    /// still knows them as a captain.
    func asPlayer() -> Membership {
        Membership(
            membershipId: membershipId, teamId: teamId, teamName: teamName, teamLogo: teamLogo,
            personId: personId, personName: personName, role: .player, status: status,
            isNew: isNew, rosterId: rosterId
        )
    }

    enum CodingKeys: String, CodingKey {
        case role, status
        case membershipId = "membership_id"
        case teamId = "team_id"
        case teamName = "team_name"
        case teamLogo = "team_logo"
        case personId = "person_id"
        case personName = "person_name"
        case isNew = "is_new"
        case rosterId = "roster_id"
    }
}

/// What `lookup_team` gives for a code: enough for "Join UCSD Men's Club
/// Soccer?" and nothing else.
struct TeamSummary: Identifiable, Codable, Hashable {
    let id: UUID
    let name: String
    let logoPath: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case logoPath = "logo_path"
    }
}

/// What a new player tells the team about themselves. The roster shows the
/// same four things for everyone.
struct JoinProfile: Hashable {
    var name: String
    var position: String
    var playerClass: String
    var number: Int?
    var smsConsent: Bool
}

/// `join_team`'s answer. `needsProfile` means nothing was changed yet: call
/// again with a `JoinProfile`.
struct JoinResult: Decodable {
    let needsProfile: Bool
    let linked: Bool
    let membership: Membership?

    enum CodingKeys: String, CodingKey {
        case linked, membership
        case needsProfile = "needs_profile"
    }
}

/// One `memberships` row with its person, for the Members screen.
struct TeamMember: Identifiable, Codable, Hashable {
    let id: UUID
    let personId: UUID
    let role: Role
    let status: MemberStatus
    let isNew: Bool
    let createdAt: Date
    let people: Person?

    var name: String { people?.name ?? "Unknown" }

    enum CodingKeys: String, CodingKey {
        case id, role, status, people
        case personId = "person_id"
        case isNew = "is_new"
        case createdAt = "created_at"
    }
}

/// A number a captain added that hasn't signed in yet.
struct Invite: Identifiable, Codable, Hashable {
    let id: UUID
    let phone: String
    let role: Role
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, phone, role
        case createdAt = "created_at"
    }
}

/// One status change, from `membership_history`. Staff read these to count
/// attendance only over the stretches a player was on the team.
struct MembershipStatusChange: Identifiable, Codable, Hashable {
    let id: UUID
    let membershipId: UUID
    let status: MemberStatus
    let changedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, status
        case membershipId = "membership_id"
        case changedAt = "changed_at"
    }
}

/// The roster's vocabulary, matching the database's check constraints.
enum RosterVocabulary {
    static let positions = ["Goalkeeper", "Defender", "Midfielder", "Forward"]
    static let classes = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"]
}
