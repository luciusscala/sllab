import Foundation

/// When each member was active on the team, built from `membership_history`.
/// Attendance counts an event against a player only if they were active when
/// it happened: someone who joined in week six isn't marked absent for weeks
/// one to five, and someone marked away isn't chased for events while away.
struct ActivePeriods {
    private struct Period { let start: Date; let end: Date? }
    private let periods: [UUID: [Period]]

    /// `personOf` maps a membership id to its person, since history rows are
    /// keyed by membership.
    init(history: [MembershipStatusChange], personOf: [UUID: UUID]) {
        var periods: [UUID: [Period]] = [:]
        let byMembership = Dictionary(grouping: history, by: \.membershipId)

        for (membershipId, changes) in byMembership {
            guard let personId = personOf[membershipId] else { continue }
            var open: Date?
            var list: [Period] = []
            for change in changes.sorted(by: { $0.changedAt < $1.changedAt }) {
                switch (change.status, open) {
                case (.active, nil):
                    open = change.changedAt
                case (.away, let start?), (.inactive, let start?):
                    list.append(Period(start: start, end: change.changedAt))
                    open = nil
                default:
                    break
                }
            }
            if let open { list.append(Period(start: open, end: nil)) }
            periods[personId, default: []].append(contentsOf: list)
        }
        self.periods = periods
    }

    /// Empty: everyone counts as always active, which is what the dashboard
    /// does before the history has loaded.
    init() { periods = [:] }

    func isActive(_ personId: UUID, at date: Date) -> Bool {
        guard let list = periods[personId] else { return true }
        return list.contains { $0.start <= date && ($0.end.map { date < $0 } ?? true) }
    }
}
