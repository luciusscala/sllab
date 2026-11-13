import Foundation
import Supabase

/// Who is signed in and where they stand on their team.
///
/// Supabase Auth keeps the session (in the Keychain, refreshed on its own);
/// this watches it and keeps the person's memberships alongside. Every view
/// reads `current` for what to show, and the database checks the same
/// membership on every request, so nothing here is a credential.
@Observable
final class Session {
    enum State { case loading, signedOut, signedIn }

    private(set) var state: State = .loading
    private(set) var memberships: [Membership] = []
    /// The verified number as stored (`14155550100`); nil for guests.
    private(set) var phone: String?
    private(set) var isAnonymous = false

    /// Which team the app shows, for someone on more than one.
    private static let teamKey = "teamID"

    private var supabase: SupabaseClient { SupabaseConfig.client }

    /// The membership the app is showing: the remembered team if they're on
    /// it, else the first team they haven't left. Nil sends them to the join
    /// flow, which also offers to rejoin a team they left.
    var current: Membership? {
        let open = memberships.filter { $0.status != .inactive }
        let remembered = UserDefaults.standard.string(forKey: Self.teamKey).flatMap(UUID.init)
        return open.first { $0.teamId == remembered } ?? open.first
    }

    var left: [Membership] { memberships.filter { $0.status == .inactive } }

    /// A captain looking at the app the way players see it, from Settings.
    /// Not saved: every launch starts in their own view.
    var isViewingAsPlayer = false

    /// The membership the screens are drawn for: `current`, as a player
    /// while a captain is viewing as one.
    var displayed: Membership? {
        guard let current else { return nil }
        return isViewingAsPlayer && current.isCaptain ? current.asPlayer() : current
    }

    // MARK: - Lifecycle

    /// Follows the auth session for the life of the app. The first event
    /// carries the stored session, so the app knows where it stands before
    /// drawing anything.
    func start() async {
        for await (event, session) in supabase.auth.authStateChanges {
            switch event {
            case .initialSession, .signedIn, .tokenRefreshed, .userUpdated:
                if let session {
                    phone = session.user.phone.flatMap { $0.isEmpty ? nil : $0 }
                    isAnonymous = session.user.isAnonymous
                    await refreshMemberships()
                    state = .signedIn
                } else {
                    clear()
                }
            case .signedOut, .userDeleted:
                clear()
            default:
                break
            }
        }
    }

    private func clear() {
        memberships = []
        isViewingAsPlayer = false
        phone = nil
        isAnonymous = false
        state = .signedOut
    }

    func refreshMemberships() async {
        do {
            memberships = try await supabase.rpc("my_memberships").execute().value
        } catch {
            // A failed refresh keeps what we had; the next event tries again.
        }
    }

    func select(teamId: UUID) {
        isViewingAsPlayer = false
        UserDefaults.standard.set(teamId.uuidString, forKey: Self.teamKey)
    }

    // MARK: - Signing in

    func lookupTeam(code: String) async throws -> TeamSummary? {
        let teams: [TeamSummary] = try await supabase
            .rpc("lookup_team", params: ["p_code": code])
            .execute()
            .value
        return teams.first
    }

    func sendCode(to phone: String) async throws {
        try await supabase.auth.signInWithOTP(phone: phone)
    }

    func verify(phone: String, code: String) async throws {
        try await supabase.auth.verifyOTP(phone: phone, token: code, type: .sms)
    }

    func signInAsGuest() async throws {
        try await supabase.auth.signInAnonymously()
    }

    private struct JoinParams: Encodable {
        let p_code: String
        let p_name: String?
        let p_position: String?
        let p_class: String?
        let p_number: Int?
        let p_sms_consent: Bool
    }

    /// The whole join, in one call. With no profile it links a known number,
    /// applies an invite, or asks for one (`needsProfile`); with a profile it
    /// creates the new player.
    func join(code: String, profile: JoinProfile? = nil) async throws -> JoinResult {
        let rows: [JoinResult] = try await supabase
            .rpc("join_team", params: JoinParams(
                p_code: code,
                p_name: profile?.name,
                p_position: profile?.position,
                p_class: profile?.playerClass,
                p_number: profile?.number,
                p_sms_consent: profile?.smsConsent ?? false
            ))
            .execute()
            .value
        guard let result = rows.first else { throw SessionError.unexpected }

        if let membership = result.membership, !result.needsProfile {
            select(teamId: membership.teamId)
            await refreshMemberships()
        }
        return result
    }

    // MARK: - My membership

    /// "Are you playing this season?" — Yes.
    func continueSeason() async throws {
        guard let current else { return }
        try await supabase
            .rpc("continue_season", params: ["p_team_id": current.teamId])
            .execute()
        await refreshMemberships()
    }

    /// Leave Team, and Rejoin from the join screen.
    func setMyStatus(_ status: MemberStatus, membership: Membership) async throws {
        struct Params: Encodable { let p_membership_id: UUID; let p_status: String }
        try await supabase
            .rpc("set_member_status", params: Params(p_membership_id: membership.membershipId, p_status: status.rawValue))
            .execute()
        if status == .active { select(teamId: membership.teamId) }
        await refreshMemberships()
    }

    func signOut() async {
        try? await supabase.auth.signOut()
        clear()
    }

    /// Keeps the roster history; drops the number, the sign-in and every
    /// membership. Signs the device out as a side effect, since the user is
    /// gone.
    func deleteAccount() async throws {
        try await supabase.rpc("delete_my_account").execute()
        try? await supabase.auth.signOut()
        clear()
    }

    // MARK: - Reminders

    /// Texts `message` to the chosen players through the platform API, which
    /// looks up their numbers; none leave the server. The app's access token
    /// is the credential, and the API checks it names a captain or coach.
    func sendReminder(eventID: UUID, to rosterIds: Set<UUID>, message: String) async throws -> ReminderResult {
        guard let current else { throw SessionError.notOnTeam }
        let token = try await supabase.auth.session.accessToken

        struct Request: Encodable {
            let teamId: UUID
            let eventId: UUID
            let rosterIds: [UUID]
            let message: String
        }
        return try await APIClient.post(
            "v1/reminders",
            body: Request(teamId: current.teamId, eventId: eventID, rosterIds: Array(rosterIds), message: message),
            token: token
        )
    }

    // MARK: - Errors

    enum SessionError: LocalizedError {
        case unexpected, notOnTeam

        var errorDescription: String? {
            switch self {
            case .unexpected: return "Something went wrong. Please try again."
            case .notOnTeam: return "You're not on a team."
            }
        }
    }

    /// The database's error names, in words a person can act on.
    static func explain(_ error: Error) -> String {
        let message = error.localizedDescription
        if message.contains("invalid_code") { return "That team code isn't right. Check it with your captain." }
        if message.contains("phone_in_use") { return "That roster spot is already linked to another account." }
        if message.contains("no_current_season") { return "There's no current season yet. Ask a captain to set one." }
        if message.contains("last_captain") { return "The team needs at least one captain." }
        if message.contains("not_allowed") { return "You can't do that for this member." }
        return message
    }
}

struct ReminderResult: Decodable {
    let sent: Int
    let failed: Int
}
