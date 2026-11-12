import Foundation
import Supabase

/// The team's data: season, roster, events, responses, members. Every read
/// and write goes straight to Supabase as the signed-in person, so the
/// database's rules decide what comes back; this class shapes it for views.
@Observable
final class DataService {

    var teams: [Team] = []
    var currentSeason: Season?
    var roster: [RosterEntry] = []
    var events: [Event] = []
    var availabilityByEvent: [UUID: [Availability]] = [:]

    // Subtype caches
    var practices: [UUID: Practice] = [:]   // keyed by event_id
    var games: [UUID: Game] = [:]           // keyed by event_id
    var socialEvents: [UUID: SocialEvent] = [:]
    var tournaments: [UUID: Tournament] = [:]

    // Members
    var members: [TeamMember] = []
    var invites: [Invite] = []
    var activePeriods = ActivePeriods()

    // Captain dashboard
    var allSeasonEvents: [Event] = []
    var allSeasonAvailability: [UUID: [Availability]] = [:]
    var hasLoadedDashboard = false

    var currentTeamId: UUID?

    var isLoading = false
    var hasLoadedSchedule = false
    var errorMessage: String?

    private var supabase: SupabaseClient { SupabaseConfig.client }

    // MARK: - Teams

    func fetchTeams() async {
        do {
            teams = try await supabase
                .from("teams")
                .select()
                .execute()
                .value
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updateHometown(personId: UUID, hometown: String) async {
        do {
            try await supabase
                .from("people")
                .update(["hometown": hometown])
                .eq("id", value: personId.uuidString)
                .execute()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Fields

    var fields: [Field] = []

    func fetchFields() async {
        do {
            fields = try await supabase
                .from("fields")
                .select()
                .execute()
                .value
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Season

    func fetchCurrentSeason() async {
        do {
            let seasons: [Season] = try await supabase
                .from("seasons")
                .select()
                .eq("is_current", value: true)
                .execute()
                .value
            currentSeason = seasons.first
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Roster

    func fetchRoster(seasonId: UUID) async {
        do {
            var query = supabase
                .from("roster")
                .select("*, people(*)")
                .eq("season_id", value: seasonId.uuidString)
            if let teamId = currentTeamId {
                query = query.eq("team_id", value: teamId.uuidString)
            }
            roster = try await query
                .execute()
                .value

            // Sort by number, then name
            roster.sort {
                if let a = $0.number, let b = $1.number { return a < b }
                if $0.number != nil { return true }
                if $1.number != nil { return false }
                return $0.displayName < $1.displayName
            }
        } catch {
            print("fetchRoster error: \(error)")
            errorMessage = "Roster: \(error.localizedDescription)"
        }
    }

    // MARK: - Members

    func fetchMembers() async {
        guard let teamId = currentTeamId else { return }
        do {
            members = try await supabase
                .from("memberships")
                .select("*, people(*)")
                .eq("team_id", value: teamId.uuidString)
                .execute()
                .value
            members.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Staff only; the policy returns nothing for anyone else.
    func fetchInvites() async {
        guard let teamId = currentTeamId else { return }
        do {
            invites = try await supabase
                .from("team_invites")
                .select()
                .eq("team_id", value: teamId.uuidString)
                .is("accepted_at", value: nil)
                .order("created_at")
                .execute()
                .value
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Staff only. Builds the active periods the dashboard counts over.
    func fetchMembershipHistory() async {
        guard !members.isEmpty else { return }
        do {
            let history: [MembershipStatusChange] = try await supabase
                .from("membership_history")
                .select()
                .in("membership_id", values: members.map(\.id.uuidString))
                .execute()
                .value
            let personOf = Dictionary(uniqueKeysWithValues: members.map { ($0.id, $0.personId) })
            activePeriods = ActivePeriods(history: history, personOf: personOf)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// People currently on the team. Until members have loaded, everyone on
    /// the roster counts, so the schedule never shows an empty list first.
    var activePersonIds: Set<UUID>? {
        members.isEmpty ? nil : Set(members.filter { $0.status == .active }.map(\.personId))
    }

    /// The roster less anyone away or gone: who is asked, listed and counted.
    var activeRoster: [RosterEntry] {
        guard let active = activePersonIds else { return roster }
        return roster.filter { active.contains($0.personId) }
    }

    /// `responses` for people who are still around. Someone away keeps their
    /// answer in the database; it just isn't shown.
    func activeResponses(_ responses: [Availability]) -> [Availability] {
        let rosterIds = Set(activeRoster.map(\.id))
        return responses.filter { rosterIds.contains($0.rosterId) }
    }

    // MARK: Members — staff actions

    private func memberRpc(_ fn: String, params: some Encodable & Sendable) async throws {
        try await supabase.rpc(fn, params: params).execute()
        await fetchMembers()
    }

    /// Keep (true) or Remove (false) from the New Members list.
    func reviewMember(_ member: TeamMember, keep: Bool) async throws {
        struct Params: Encodable { let p_membership_id: UUID; let p_keep: Bool }
        try await memberRpc("review_member", params: Params(p_membership_id: member.id, p_keep: keep))
        if !keep, let seasonId = currentSeason?.id { await fetchRoster(seasonId: seasonId) }
    }

    func setStatus(_ status: MemberStatus, for member: TeamMember) async throws {
        struct Params: Encodable { let p_membership_id: UUID; let p_status: String }
        try await memberRpc("set_member_status", params: Params(p_membership_id: member.id, p_status: status.rawValue))
    }

    /// Captains only.
    func setRole(_ role: Role, for member: TeamMember) async throws {
        struct Params: Encodable { let p_membership_id: UUID; let p_role: String }
        try await memberRpc("set_member_role", params: Params(p_membership_id: member.id, p_role: role.rawValue))
        if let seasonId = currentSeason?.id { await fetchRoster(seasonId: seasonId) }
    }

    /// Add by phone number; the role applies when that number signs in.
    func invite(phone: String, role: Role) async throws {
        guard let teamId = currentTeamId else { return }
        struct Params: Encodable { let p_team_id: UUID; let p_phone: String; let p_role: String }
        try await supabase
            .rpc("invite_member", params: Params(p_team_id: teamId, p_phone: phone, p_role: role.rawValue))
            .execute()
        await fetchMembers()
        await fetchInvites()
    }

    func cancelInvite(_ invite: Invite) async throws {
        try await supabase
            .from("team_invites")
            .delete()
            .eq("id", value: invite.id.uuidString)
            .execute()
        await fetchInvites()
    }

    // MARK: - Events

    func fetchEvents(seasonId: UUID) async {
        let isInitialLoad = events.isEmpty
        if isInitialLoad { isLoading = true }
        defer { if isInitialLoad { isLoading = false } }

        do {
            var query = supabase
                .from("events")
                .select()
                .eq("season_id", value: seasonId.uuidString)
            if let teamId = currentTeamId {
                query = query.eq("team_id", value: teamId.uuidString)
            }
            events = try await query
                .order("event_date")
                .execute()
                .value

            // Fetch subtype details for all events in parallel
            await withTaskGroup(of: Void.self) { group in
                for event in events {
                    group.addTask { await self.fetchEventSubtype(event) }
                }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func fetchEventSubtype(_ event: Event) async {
        do {
            switch event.eventType {
            case "practice":
                let results: [Practice] = try await supabase
                    .from("practices")
                    .select("*, fields(*)")
                    .eq("event_id", value: event.id.uuidString)
                    .execute()
                    .value
                if let practice = results.first {
                    practices[event.id] = practice
                }

            case "game":
                let response = try await supabase
                    .from("games")
                    .select("*, fields(*), home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)")
                    .eq("event_id", value: event.id.uuidString)
                    .execute()
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                var results: [Game] = try decoder.decode([Game].self, from: response.data)
                if let teamId = currentTeamId {
                    for i in results.indices {
                        results[i].myTeamId = teamId
                    }
                }
                if let game = results.first {
                    games[event.id] = game
                }

            case "social":
                let results: [SocialEvent] = try await supabase
                    .from("social_events")
                    .select()
                    .eq("event_id", value: event.id.uuidString)
                    .execute()
                    .value
                if let social = results.first {
                    socialEvents[event.id] = social
                }

            case "tournament":
                let results: [Tournament] = try await supabase
                    .from("tournaments")
                    .select("*, fields(*)")
                    .eq("event_id", value: event.id.uuidString)
                    .execute()
                    .value
                if let tournament = results.first {
                    tournaments[event.id] = tournament
                }

            default:
                break
            }
        } catch {
            print("Failed to fetch subtype for event \(event.id): \(error)")
        }
    }

    // MARK: - Availability

    func fetchAvailability(eventId: UUID) async {
        do {
            let results: [Availability] = try await supabase
                .from("availability")
                .select("*, roster(*, people(*))")
                .eq("event_id", value: eventId.uuidString)
                .execute()
                .value
            availabilityByEvent[eventId] = results
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func fetchAllAvailability(for eventIds: [UUID]) async {
        await withTaskGroup(of: Void.self) { group in
            for eventId in eventIds {
                group.addTask { await self.fetchAvailability(eventId: eventId) }
            }
        }
    }

    func setAvailability(eventId: UUID, rosterId: UUID, status: AvailabilityStatus) async {
        // Optimistic update: immediately reflect in local state
        if var existing = availabilityByEvent[eventId] {
            if let idx = existing.firstIndex(where: { $0.rosterId == rosterId }) {
                let old = existing[idx]
                existing[idx] = Availability(
                    id: old.id,
                    eventId: old.eventId,
                    rosterId: old.rosterId,
                    status: status,
                    updatedAt: old.updatedAt,
                    roster: old.roster
                )
            } else {
                existing.append(Availability(
                    id: UUID(),
                    eventId: eventId,
                    rosterId: rosterId,
                    status: status,
                    updatedAt: nil,
                    roster: roster.first { $0.id == rosterId }
                ))
            }
            availabilityByEvent[eventId] = existing
        } else {
            availabilityByEvent[eventId] = [Availability(
                id: UUID(),
                eventId: eventId,
                rosterId: rosterId,
                status: status,
                updatedAt: nil,
                roster: roster.first { $0.id == rosterId }
            )]
        }

        do {
            let payload: [String: String] = [
                "event_id": eventId.uuidString,
                "roster_id": rosterId.uuidString,
                "status": status.rawValue
            ]
            try await supabase
                .from("availability")
                .upsert(payload, onConflict: "event_id,roster_id")
                .execute()
        } catch {
            // The database said no (not a player, or not active): show the truth.
            await fetchAvailability(eventId: eventId)
            errorMessage = error.localizedDescription
        }
    }

    func deleteAvailability(eventId: UUID, rosterId: UUID) async {
        // Optimistic update: remove from local state
        if var existing = availabilityByEvent[eventId] {
            existing.removeAll { $0.rosterId == rosterId }
            availabilityByEvent[eventId] = existing
        }

        // Sync with server
        do {
            try await supabase
                .from("availability")
                .delete()
                .eq("event_id", value: eventId.uuidString)
                .eq("roster_id", value: rosterId.uuidString)
                .execute()

            await fetchAvailability(eventId: eventId)
        } catch {
            await fetchAvailability(eventId: eventId)
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Composite Helpers

    func eventsWithAvailability(currentRosterId: UUID?) -> [EventWithAvailability] {
        events.map { event in
            let responses = activeResponses(availabilityByEvent[event.id] ?? [])
            let myStatus = currentRosterId.flatMap { id in responses.first { $0.rosterId == id }?.status }
            var item = EventWithAvailability(
                event: event,
                responses: responses,
                currentRosterStatus: myStatus
            )
            item.practice = practices[event.id]
            item.game = games[event.id]
            item.socialEvent = socialEvents[event.id]
            item.tournament = tournaments[event.id]
            return item
        }
    }

    func rosterWithoutResponse(eventId: UUID) -> [RosterEntry] {
        let respondedIds = Set((availabilityByEvent[eventId] ?? []).map(\.rosterId))
        return activeRoster.filter { !respondedIds.contains($0.id) }
    }

    // MARK: - Admin: Create Events

    func createPractice(seasonId: UUID, date: Date, fieldId: UUID, notes: String?) async {
        do {
            var eventPayload: [String: String] = [
                "season_id": seasonId.uuidString,
                "event_type": "practice",
                "event_date": ISO8601DateFormatter().string(from: date)
            ]
            if let teamId = currentTeamId {
                eventPayload["team_id"] = teamId.uuidString
            }
            let eventResult: [Event] = try await supabase
                .from("events")
                .insert(eventPayload)
                .select()
                .execute()
                .value

            guard let newEvent = eventResult.first else { return }

            var practicePayload: [String: String] = [
                "event_id": newEvent.id.uuidString,
                "field_id": fieldId.uuidString
            ]
            if let notes, !notes.isEmpty {
                practicePayload["notes"] = notes
            }
            try await supabase
                .from("practices")
                .insert(practicePayload)
                .execute()

            // Refresh schedule
            hasLoadedSchedule = false
            await fetchEvents(seasonId: seasonId)
            await fetchAllAvailability(for: events.map(\.id))
            hasLoadedSchedule = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func createRepeatingPractices(seasonId: UUID, days: Set<Int>, startDate: Date, endDate: Date, time: Date, fieldId: UUID, notes: String?) async {
        let calendar = Calendar.current
        let timeComponents = calendar.dateComponents([.hour, .minute], from: time)

        var currentDate = startDate
        while currentDate <= endDate {
            let weekday = calendar.component(.weekday, from: currentDate)
            if days.contains(weekday) {
                var dateComponents = calendar.dateComponents([.year, .month, .day], from: currentDate)
                dateComponents.hour = timeComponents.hour
                dateComponents.minute = timeComponents.minute
                if let practiceDate = calendar.date(from: dateComponents) {
                    await createPractice(seasonId: seasonId, date: practiceDate, fieldId: fieldId, notes: notes)
                }
            }
            currentDate = calendar.date(byAdding: .day, value: 1, to: currentDate) ?? currentDate
            // Safety: break if stuck
            if currentDate > endDate.addingTimeInterval(86400) { break }
        }
    }

    func createGame(seasonId: UUID, date: Date, opponentId: UUID, fieldId: UUID, isHome: Bool) async {
        do {
            var eventPayload: [String: String] = [
                "season_id": seasonId.uuidString,
                "event_type": "game",
                "event_date": ISO8601DateFormatter().string(from: date)
            ]
            if let teamId = currentTeamId {
                eventPayload["team_id"] = teamId.uuidString
            }
            let eventResult: [Event] = try await supabase
                .from("events")
                .insert(eventPayload)
                .select()
                .execute()
                .value

            guard let newEvent = eventResult.first else { return }

            let homeId = isHome ? (currentTeamId ?? UUID()) : opponentId
            let awayId = isHome ? opponentId : (currentTeamId ?? UUID())

            let gamePayload: [String: AnyJSON] = [
                "event_id": .string(newEvent.id.uuidString),
                "home_team_id": .string(homeId.uuidString),
                "away_team_id": .string(awayId.uuidString),
                "field_id": .string(fieldId.uuidString),
                "is_neutral": .bool(false)
            ]
            try await supabase
                .from("games")
                .insert(gamePayload)
                .execute()

            hasLoadedSchedule = false
            await fetchEvents(seasonId: seasonId)
            await fetchAllAvailability(for: events.map(\.id))
            hasLoadedSchedule = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Admin: Update Events

    func updatePractice(eventId: UUID, date: Date, fieldId: UUID, notes: String?) async {
        do {
            try await supabase
                .from("events")
                .update(["event_date": ISO8601DateFormatter().string(from: date)])
                .eq("id", value: eventId.uuidString)
                .execute()

            var practiceUpdate: [String: String] = ["field_id": fieldId.uuidString]
            practiceUpdate["notes"] = notes ?? ""
            try await supabase
                .from("practices")
                .update(practiceUpdate)
                .eq("event_id", value: eventId.uuidString)
                .execute()

            if let seasonId = currentSeason?.id {
                hasLoadedSchedule = false
                await fetchEvents(seasonId: seasonId)
                await fetchAllAvailability(for: events.map(\.id))
                hasLoadedSchedule = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updateGame(eventId: UUID, date: Date, opponentId: UUID, fieldId: UUID, isHome: Bool) async {
        do {
            try await supabase
                .from("events")
                .update(["event_date": ISO8601DateFormatter().string(from: date)])
                .eq("id", value: eventId.uuidString)
                .execute()

            let homeId = isHome ? (currentTeamId ?? UUID()) : opponentId
            let awayId = isHome ? opponentId : (currentTeamId ?? UUID())

            let gameUpdate: [String: AnyJSON] = [
                "home_team_id": .string(homeId.uuidString),
                "away_team_id": .string(awayId.uuidString),
                "field_id": .string(fieldId.uuidString),
                "is_neutral": .bool(false)
            ]
            try await supabase
                .from("games")
                .update(gameUpdate)
                .eq("event_id", value: eventId.uuidString)
                .execute()

            if let seasonId = currentSeason?.id {
                hasLoadedSchedule = false
                await fetchEvents(seasonId: seasonId)
                await fetchAllAvailability(for: events.map(\.id))
                hasLoadedSchedule = true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Admin: Delete Events

    /// The event's row cascades to its subtype row and the responses.
    func deleteEvent(eventId: UUID) async {
        do {
            try await supabase
                .from("events")
                .delete()
                .eq("id", value: eventId.uuidString)
                .execute()

            // Remove from local state
            events.removeAll { $0.id == eventId }
            practices.removeValue(forKey: eventId)
            games.removeValue(forKey: eventId)
            socialEvents.removeValue(forKey: eventId)
            tournaments.removeValue(forKey: eventId)
            availabilityByEvent.removeValue(forKey: eventId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Bulk Actions

    func bulkSetAvailability(eventIds: [UUID], rosterId: UUID, status: AvailabilityStatus) async {
        // Upsert all in parallel (skip per-event refetch)
        await withTaskGroup(of: Void.self) { group in
            for eventId in eventIds {
                group.addTask {
                    let payload: [String: String] = [
                        "event_id": eventId.uuidString,
                        "roster_id": rosterId.uuidString,
                        "status": status.rawValue
                    ]
                    try? await self.supabase
                        .from("availability")
                        .upsert(payload, onConflict: "event_id,roster_id")
                        .execute()
                }
            }
        }
        // Single bulk refresh at the end
        await fetchAllAvailability(for: eventIds)
    }

    func bulkDeleteEvents(eventIds: [UUID]) async {
        for eventId in eventIds {
            await deleteEvent(eventId: eventId)
        }
    }

    // MARK: - Captain Dashboard

    /// Everything the attendance screens need: past events, every response,
    /// and who was on the team when.
    func loadDashboard() async {
        guard let season = currentSeason else { return }
        hasLoadedDashboard = false
        await fetchAllSeasonEvents(seasonId: season.id)
        await fetchAllSeasonAvailability()
        if members.isEmpty { await fetchMembers() }
        await fetchMembershipHistory()
        hasLoadedDashboard = true
    }

    func fetchAllSeasonEvents(seasonId: UUID) async {
        do {
            // Only past events (up to end of today) — future events
            // shouldn't count against a player's response rate.
            let endOfToday = Calendar.current.startOfDay(for: Date()).addingTimeInterval(86400)
            let cutoff = ISO8601DateFormatter().string(from: endOfToday)

            var query = supabase
                .from("events")
                .select()
                .eq("season_id", value: seasonId.uuidString)
                .lte("event_date", value: cutoff)
            if let teamId = currentTeamId {
                query = query.eq("team_id", value: teamId.uuidString)
            }
            allSeasonEvents = try await query
                .order("event_date")
                .execute()
                .value
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func fetchAllSeasonAvailability() async {
        await withTaskGroup(of: (UUID, [Availability]).self) { group in
            for event in allSeasonEvents {
                group.addTask {
                    do {
                        let results: [Availability] = try await self.supabase
                            .from("availability")
                            .select("*, roster(*, people(*))")
                            .eq("event_id", value: event.id.uuidString)
                            .execute()
                            .value
                        return (event.id, results)
                    } catch {
                        return (event.id, [])
                    }
                }
            }
            for await (eventId, results) in group {
                allSeasonAvailability[eventId] = results
            }
        }
    }

    func filteredSeasonEvents(since: Date? = nil) -> [Event] {
        guard let since else { return allSeasonEvents }
        return allSeasonEvents.filter { $0.eventDate >= since }
    }

    /// Attendance for everyone currently active, over the events that fell
    /// while they were active. Someone who joined mid-season isn't marked
    /// absent for the weeks before.
    func playerAttendanceStats(since: Date? = nil) -> [PlayerAttendanceStats] {
        let filtered = filteredSeasonEvents(since: since)

        return activeRoster.map { entry in
            var totalEvents = 0
            var goingCount = 0
            var notGoingCount = 0
            var noResponseCount = 0

            for event in filtered where activePeriods.isActive(entry.personId, at: event.eventDate) {
                totalEvents += 1
                let responses = allSeasonAvailability[event.id] ?? []
                if let response = responses.first(where: { $0.rosterId == entry.id }) {
                    switch response.status {
                    case .yes: goingCount += 1
                    case .no: notGoingCount += 1
                    }
                } else {
                    noResponseCount += 1
                }
            }

            return PlayerAttendanceStats(
                rosterEntry: entry,
                totalEvents: totalEvents,
                goingCount: goingCount,
                notGoingCount: notGoingCount,
                noResponseCount: noResponseCount
            )
        }
        .sorted { $0.issueScore > $1.issueScore }
    }

    /// Active players with no response to any of the last `count` events:
    /// the "haven't been around" list.
    func quietPlayers(lastEvents count: Int = 8) -> [RosterEntry] {
        let recent = allSeasonEvents.suffix(count)
        guard recent.count >= count else { return [] }
        let responded = Set(recent.flatMap { (allSeasonAvailability[$0.id] ?? []).map(\.rosterId) })
        return activeRoster.filter { entry in
            !responded.contains(entry.id)
                && recent.allSatisfy { activePeriods.isActive(entry.personId, at: $0.eventDate) }
        }
    }
}
