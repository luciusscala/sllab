import SwiftUI

struct EventDetailView: View {
    let eventID: UUID
    let membership: Membership
    @Environment(DataService.self) private var dataService
    @Environment(\.openURL) private var openURL
    @Environment(\.dismiss) private var dismiss
    @State private var showEditSheet = false
    @State private var showDeleteAlert = false
    @State private var showMessageComposer = false

    private var event: Event? {
        dataService.events.first { $0.id == eventID }
    }

    /// Nil when this person can't answer: a guest, a coach, someone away.
    private var rosterID: UUID? {
        membership.canRespond ? membership.rosterId : nil
    }

    /// Answers from people still on the team.
    private var responses: [Availability] {
        dataService.activeResponses(dataService.availabilityByEvent[eventID] ?? [])
    }

    private var myStatus: AvailabilityStatus? {
        guard let rosterID else { return nil }
        return responses.first { $0.rosterId == rosterID }?.status
    }

    private var noResponseRoster: [RosterEntry] {
        dataService.rosterWithoutResponse(eventId: eventID)
    }

    var body: some View {
        ScrollView {
            if let event {
                VStack(spacing: 24) {
                    eventInfoCard(event)
                    if let rosterID {
                        availabilityPickerSection(event, rosterID: rosterID)
                    }
                    rosterBreakdown
                }
                .padding()
            } else {
                ProgressView()
            }
        }
        .fixtureBackground()
        .navigationTitle(event?.typeLabel ?? "Event")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if membership.isStaff, let event {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        showMessageComposer = true
                    } label: {
                        Image(systemName: "paperplane")
                    }
                    Button {
                        showEditSheet = true
                    } label: {
                        Image(systemName: "pencil")
                    }
                    Button(role: .destructive) {
                        showDeleteAlert = true
                    } label: {
                        Image(systemName: "trash")
                    }
                }
            }
        }
        .alert("Delete Event", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) {
                guard let event else { return }
                Task {
                    await dataService.deleteEvent(eventId: event.id)
                    dismiss()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete this event? This cannot be undone.")
        }
        .sheet(isPresented: $showEditSheet) {
            if let event {
                if event.eventType == "practice" {
                    let practice = dataService.practices[event.id]
                    PracticeFormView(
                        editingEventId: event.id,
                        initialDate: event.eventDate,
                        initialFieldId: practice?.fieldId,
                        initialNotes: practice?.notes
                    )
                } else if event.eventType == "game" {
                    let game = dataService.games[event.id]
                    GameFormView(
                        editingEventId: event.id,
                        initialDate: event.eventDate,
                        initialOpponentId: game?.opponentId,
                        initialFieldId: game?.fieldId,
                        initialIsHome: game?.isHome
                    )
                }
            }
        }
        .sheet(isPresented: $showMessageComposer) {
            if let event {
                MessageComposerView(event: event, eventID: eventID)
            }
        }
        .task {
            await dataService.fetchAvailability(eventId: eventID)
        }
    }

    // MARK: - Event Info Card

    private func eventInfoCard(_ event: Event) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Game: show opponent with logo
            if event.eventType == "game", let game = dataService.games[event.id] {
                HStack(spacing: 10) {
                    if let logoPath = game.opponent?.logoPath,
                       let logoURL = SupabaseConfig.storageURL(for: logoPath) {
                        AsyncImage(url: logoURL) { image in
                            image.resizable().scaledToFit()
                        } placeholder: {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(AppTheme.surfaceRaised)
                        }
                        .frame(width: 40, height: 40)
                        .clipShape(.rect(cornerRadius: 8))
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(game.title)
                            .font(.title3.weight(.semibold))
                        Text(game.isHome ? "Home" : "Away")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
            } else {
                Text(event.typeLabel)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(AppTheme.eventColor(event.eventType))
            }

            Divider()

            VStack(alignment: .leading, spacing: 8) {
                Text(event.eventDate.formatted(.dateTime.weekday(.wide).month().day()))
                    .font(.body)

                Text(event.eventDate.formatted(.dateTime.hour().minute()))
                    .font(.body)
                    .foregroundStyle(.secondary)

                // Location — tappable to open Google Maps
                if let locationName = subtypeLocation(for: event) {
                    if let address = subtypeMapsAddress(for: event),
                       let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
                       let mapsURL = URL(string: "https://maps.google.com/?q=\(encoded)") {
                        Button {
                            openURL(mapsURL)
                        } label: {
                            HStack(spacing: 4) {
                                Text(locationName)
                                    .font(.body)
                                Image(systemName: "arrow.up.right.square")
                                    .font(.caption)
                            }
                            .foregroundStyle(AppTheme.text)
                        }
                    } else {
                        Text(locationName)
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // Notes
            if let notes = subtypeNotes(for: event) {
                Divider()
                Text(notes)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(AppTheme.surface, in: .rect(cornerRadius: AppTheme.cornerRadius))
    }

    // MARK: - Availability Picker

    private func availabilityPickerSection(_ event: Event, rosterID: UUID) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Your Availability")
                .font(.headline)
            AvailabilityPicker(selected: myStatus) { newStatus in
                Task {
                    await dataService.setAvailability(
                        eventId: event.id,
                        rosterId: rosterID,
                        status: newStatus
                    )
                }
            }
        }
    }

    // MARK: - Roster Breakdown

    private var rosterBreakdown: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Team Responses")
                .font(.headline)

            ForEach(AvailabilityStatus.allCases, id: \.self) { status in
                let filtered = responses.filter { $0.status == status }
                if !filtered.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            AvailabilityBadge(status: status)
                            Text("(\(filtered.count))")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        VStack(spacing: 0) {
                            ForEach(filtered) { avail in
                                HStack {
                                    if let num = avail.roster?.number {
                                        Text("#\(num)")
                                            .font(.subheadline.monospaced().weight(.semibold))
                                            .foregroundStyle(.secondary)
                                            .frame(width: 36, alignment: .trailing)
                                    }
                                    Text(avail.roster?.displayName ?? "Unknown")
                                        .font(.body)
                                    Spacer()
                                }
                                .padding(.vertical, 8)
                                .padding(.horizontal, 12)
                                if avail.id != filtered.last?.id {
                                    Divider()
                                        .padding(.leading, 12)
                                }
                            }
                        }
                        .background(AppTheme.surface, in: .rect(cornerRadius: AppTheme.cornerRadius))
                    }
                }
            }

            if !noResponseRoster.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("No Response")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)
                        Text("(\(noResponseRoster.count))")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    VStack(spacing: 0) {
                        ForEach(noResponseRoster) { entry in
                            HStack {
                                if let num = entry.number {
                                    Text("#\(num)")
                                        .font(.subheadline.monospaced().weight(.semibold))
                                        .foregroundStyle(.secondary)
                                        .frame(width: 36, alignment: .trailing)
                                }
                                Text(entry.displayName)
                                    .font(.body)
                                    .foregroundStyle(.secondary)
                                Spacer()
                            }
                            .padding(.vertical, 8)
                            .padding(.horizontal, 12)
                            if entry.id != noResponseRoster.last?.id {
                                Divider()
                                    .padding(.leading, 12)
                            }
                        }
                    }
                    .background(AppTheme.surface, in: .rect(cornerRadius: AppTheme.cornerRadius))
                }
            }
        }
    }

    // MARK: - Helpers

    private func subtypeLocation(for event: Event) -> String? {
        switch event.eventType {
        case "practice": return dataService.practices[event.id]?.fields?.name
        case "game": return dataService.games[event.id]?.fields?.name
        case "tournament": return dataService.tournaments[event.id]?.location ?? dataService.tournaments[event.id]?.fields?.name
        default: return nil
        }
    }

    private func subtypeMapsAddress(for event: Event) -> String? {
        switch event.eventType {
        case "practice": return dataService.practices[event.id]?.fields?.mapsAddress
        case "game": return dataService.games[event.id]?.fields?.mapsAddress
        case "tournament": return dataService.tournaments[event.id]?.fields?.mapsAddress
        default: return nil
        }
    }

    private func subtypeNotes(for event: Event) -> String? {
        switch event.eventType {
        case "practice": return dataService.practices[event.id]?.notes
        default: return nil
        }
    }

}
