import Testing
import Foundation
@testable import ucsdmcs

struct ActivePeriodsTests {

    static let membershipId = UUID()
    static let personId = UUID()
    static let t0 = Date(timeIntervalSince1970: 1_700_000_000)

    static func change(_ status: MemberStatus, at offsetDays: Double) -> MembershipStatusChange {
        MembershipStatusChange(
            id: UUID(), membershipId: membershipId, status: status,
            changedAt: t0.addingTimeInterval(offsetDays * 86400)
        )
    }

    static func periods(_ history: [MembershipStatusChange]) -> ActivePeriods {
        ActivePeriods(history: history, personOf: [membershipId: personId])
    }

    @Test func emptyHistoryMeansAlwaysActive() {
        let periods = ActivePeriods()
        #expect(periods.isActive(UUID(), at: Date()))
    }

    @Test func unknownPersonCountsAsActive() {
        let periods = Self.periods([Self.change(.active, at: 0)])
        #expect(periods.isActive(UUID(), at: Self.t0))
    }

    @Test func notActiveBeforeJoining() {
        let periods = Self.periods([Self.change(.active, at: 10)])
        #expect(!periods.isActive(Self.personId, at: Self.t0.addingTimeInterval(5 * 86400)))
        #expect(periods.isActive(Self.personId, at: Self.t0.addingTimeInterval(15 * 86400)))
    }

    @Test func awayStretchIsExcluded() {
        let periods = Self.periods([
            Self.change(.active, at: 0),
            Self.change(.away, at: 10),
            Self.change(.active, at: 20),
        ])
        #expect(periods.isActive(Self.personId, at: Self.t0.addingTimeInterval(5 * 86400)))
        #expect(!periods.isActive(Self.personId, at: Self.t0.addingTimeInterval(15 * 86400)))
        #expect(periods.isActive(Self.personId, at: Self.t0.addingTimeInterval(25 * 86400)))
    }

    @Test func leavingClosesThePeriod() {
        let periods = Self.periods([
            Self.change(.active, at: 0),
            Self.change(.inactive, at: 10),
        ])
        #expect(!periods.isActive(Self.personId, at: Self.t0.addingTimeInterval(10 * 86400)))
    }

    @Test func historyOrderDoesNotMatter() {
        let periods = Self.periods([
            Self.change(.away, at: 10),
            Self.change(.active, at: 0),
        ])
        #expect(periods.isActive(Self.personId, at: Self.t0.addingTimeInterval(1 * 86400)))
        #expect(!periods.isActive(Self.personId, at: Self.t0.addingTimeInterval(11 * 86400)))
    }
}
