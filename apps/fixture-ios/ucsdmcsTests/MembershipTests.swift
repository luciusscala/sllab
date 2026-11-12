import Testing
import Foundation
@testable import ucsdmcs

/// `Membership` is what every screen reads to decide what to show, so its
/// derived flags must match the database's `is_staff` / `can_respond`.
struct MembershipTests {

    static func make(
        role: Role,
        status: MemberStatus = .active,
        isNew: Bool = false,
        rosterId: UUID? = UUID()
    ) -> Membership {
        Membership(
            membershipId: UUID(), teamId: UUID(), teamName: "UCSD MCS", teamLogo: nil,
            personId: UUID(), personName: "Pat", role: role, status: status,
            isNew: isNew, rosterId: rosterId
        )
    }

    // MARK: - Flags

    @Test func activePlayerWithRosterCanRespond() {
        let m = Self.make(role: .player)
        #expect(m.canRespond)
        #expect(!m.isStaff)
        #expect(!m.needsSeasonAnswer)
    }

    @Test func captainIsStaffAndCanRespond() {
        let m = Self.make(role: .captain)
        #expect(m.isStaff)
        #expect(m.isCaptain)
        #expect(m.canRespond)
    }

    @Test func coachIsStaffButCannotRespond() {
        let m = Self.make(role: .coach, rosterId: nil)
        #expect(m.isStaff)
        #expect(!m.isCaptain)
        #expect(!m.canRespond)
        #expect(!m.needsSeasonAnswer)
    }

    @Test func guestCanDoNothing() {
        let m = Self.make(role: .guest, rosterId: nil)
        #expect(!m.isStaff)
        #expect(!m.canRespond)
        #expect(!m.needsSeasonAnswer)
    }

    @Test func awayMemberLosesPowers() {
        let m = Self.make(role: .captain, status: .away)
        #expect(!m.isStaff)
        #expect(!m.canRespond)
    }

    @Test func returningPlayerWithoutRosterNeedsSeasonAnswer() {
        let m = Self.make(role: .player, rosterId: nil)
        #expect(!m.canRespond)
        #expect(m.needsSeasonAnswer)
    }

    // MARK: - Decoding

    @Test func decodesMyMembershipsRow() throws {
        let json = """
        {
            "membership_id": "aaaaaaaa-0000-0000-0000-000000000001",
            "team_id": "bbbbbbbb-0000-0000-0000-000000000001",
            "team_name": "UCSD Men's Club Soccer",
            "team_logo": null,
            "person_id": "cccccccc-0000-0000-0000-000000000001",
            "person_name": "Pat Player",
            "role": "player",
            "status": "active",
            "is_new": true,
            "roster_id": "dddddddd-0000-0000-0000-000000000001"
        }
        """
        let m = try JSONDecoder().decode(Membership.self, from: Data(json.utf8))
        #expect(m.role == .player)
        #expect(m.status == .active)
        #expect(m.isNew)
        #expect(m.canRespond)
        #expect(m.id == m.membershipId)
    }

    @Test func decodesJoinResultNeedingProfile() throws {
        let json = """
        { "needs_profile": true, "linked": false, "membership": null }
        """
        let result = try JSONDecoder().decode(JoinResult.self, from: Data(json.utf8))
        #expect(result.needsProfile)
        #expect(result.membership == nil)
    }

    @Test func decodesTeamMemberWithPerson() throws {
        let json = """
        {
            "id": "aaaaaaaa-0000-0000-0000-000000000001",
            "team_id": "bbbbbbbb-0000-0000-0000-000000000001",
            "person_id": "cccccccc-0000-0000-0000-000000000001",
            "role": "coach",
            "status": "away",
            "is_new": false,
            "created_at": "2026-11-12T18:00:00+00:00",
            "updated_at": "2026-11-12T18:00:00+00:00",
            "people": {
                "id": "cccccccc-0000-0000-0000-000000000001",
                "name": "Coach Carter",
                "hometown": null,
                "picture_path": null
            }
        }
        """
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let member = try decoder.decode(TeamMember.self, from: Data(json.utf8))
        #expect(member.role == .coach)
        #expect(member.status == .away)
        #expect(member.name == "Coach Carter")
    }
}
