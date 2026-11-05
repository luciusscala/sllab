import SwiftUI

struct ScheduleView: View {
    let rosterID: UUID
    @Environment(DataService.self) private var dataService
    @Environment(DeepLinkManager.self) private var deepLinkManager
    @Environment(CaptainSession.self) private var captain
    @State private var showPracticeForm = false
    @State private var showRepeatingForm = false
    @State private var showGameForm = false
    @State private var navigationPath = NavigationPath()

    @State private var hasScrolledToToday = false

    // Scroll effects
    @State private var listFrame: CGRect = .zero

    // Selection mode
    @State private var isSelecting = false
    @State private var selectedEventIDs: Set<UUID> = []
    @State private var showBulkDeleteAlert = false
    @State private var isBulkActionLoading = false

    private var allEventIDs: Set<UUID> {
        Set(groupedEvents.flatMap { $0.events.map(\.event.id) })
    }

    private var allSelected: Bool {
        !allEventIDs.isEmpty && selectedEventIDs == allEventIDs
    }

    private var groupedEvents: [(date: Date, events: [EventWithAvailability])] {
        let all = dataService.eventsWithAvailability(currentRosterId: rosterID)
        let grouped = Dictionary(grouping: all) { Calendar.current.startOfDay(for: $0.event.eventDate) }
        return grouped.sorted { $0.key < $1.key }.map { (date: $0.key, events: $0.value) }
    }

    /// The date section to scroll to on initial load (today or nearest future date).
    private var todaySectionDate: Date? {
        let today = Calendar.current.startOfDay(for: Date())
        // Find the first section that is today or in the future
        return groupedEvents.first { $0.date >= today }?.date
    }

    var body: some View {
        NavigationStack(path: $navigationPath) {
            Group {
                if !dataService.hasLoadedSchedule {
                    ProgressView("Loading schedule...")
                } else if groupedEvents.isEmpty {
                    EmptyStateView(
                        icon: "calendar",
                        title: "No Upcoming Events",
                        subtitle: "Check back later for new practices and games."
                    )
                } else {
                    eventList
                }
            }
            .navigationTitle("Schedule")
            .navigationDestination(for: UUID.self) { eventID in
                EventDetailView(eventID: eventID, rosterID: rosterID)
            }
            .navigationDestination(for: String.self) { route in
                if route == "dashboard" {
                    CaptainDashboardView()
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if isSelecting {
                        Button(allSelected ? "Deselect All" : "Select All") {
                            if allSelected {
                                selectedEventIDs.removeAll()
                            } else {
                                selectedEventIDs = allEventIDs
                            }
                        }
                    } else if captain.isCaptain {
                        HStack(spacing: 4) {
                            Menu {
                                Button {
                                    showPracticeForm = true
                                } label: {
                                    Label("Add Practice", systemImage: "figure.run")
                                }
                                Button {
                                    showRepeatingForm = true
                                } label: {
                                    Label("Add Repeating Practices", systemImage: "repeat")
                                }
                                Button {
                                    showGameForm = true
                                } label: {
                                    Label("Add Game", systemImage: "sportscourt")
                                }
                            } label: {
                                Image(systemName: "plus")
                            }
                            NavigationLink(value: "dashboard") {
                                Image(systemName: "chart.bar")
                            }
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if isSelecting {
                        Button("Done") {
                            exitSelectionMode()
                        }
                        .fontWeight(.semibold)
                    } else {
                        Button("Select") {
                            isSelecting = true
                        }
                        .foregroundStyle(.white)
                    }
                }
            }
            .alert("Delete \(selectedEventIDs.count) Events?", isPresented: $showBulkDeleteAlert) {
                Button("Delete", role: .destructive) {
                    Task { await performBulkDelete() }
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("This will permanently delete the selected events and all associated availability data.")
            }
            .sheet(isPresented: $showPracticeForm) {
                PracticeFormView()
            }
            .sheet(isPresented: $showRepeatingForm) {
                RepeatingPracticeFormView()
            }
            .sheet(isPresented: $showGameForm) {
                GameFormView()
            }
            .toolbarVisibility(isSelecting ? .hidden : .automatic, for: .tabBar)
            .refreshable {
                await loadData()
            }
            .task {
                guard !dataService.hasLoadedSchedule else { return }
                await loadData()
            }
            // Wait for data before navigating to a deep-linked event,
            // otherwise the detail view shows incomplete/missing info.
            .onChange(of: deepLinkManager.pendingEventID) { _, eventID in
                if let eventID, dataService.hasLoadedSchedule {
                    navigationPath.append(eventID)
                    deepLinkManager.pendingEventID = nil
                }
            }
            .onChange(of: dataService.hasLoadedSchedule) { _, loaded in
                if loaded, let eventID = deepLinkManager.pendingEventID {
                    navigationPath.append(eventID)
                    deepLinkManager.pendingEventID = nil
                }
            }
        }
    }

    // MARK: - Event List

    private var eventList: some View {
        ScrollViewReader { proxy in
            List {
                ForEach(groupedEvents, id: \.date) { group in
                    let isPast = group.date < Calendar.current.startOfDay(for: Date())
                    Section {
                        ForEach(group.events) { item in
                            Group {
                                if isPast {
                                    NavigationLink(value: item.event.id) {
                                        EventRow(item: item)
                                    }
                                } else {
                                    eventCell(for: item)
                                }
                            }
                            .modifier(ScrollEdgeEffect(visibleFrame: listFrame))
                        }

                    } header: {
                        Text(group.date.formatted(.dateTime.weekday(.wide).month().day()))
                    }
                    .id(group.date)
                    .opacity(isPast ? 0.5 : 1)
                }
            }
            .listStyle(.insetGrouped)
            .onGeometryChange(for: CGRect.self) { geometry in
                geometry.frame(in: .global)
            } action: { frame in
                listFrame = frame
            }
            .onAppear {
                scrollToTodayIfNeeded(proxy: proxy)
            }
            .onChange(of: dataService.hasLoadedSchedule) { _, loaded in
                if loaded {
                    scrollToTodayIfNeeded(proxy: proxy)
                }
            }
            .overlay(alignment: .bottom) {
                if isSelecting && !selectedEventIDs.isEmpty {
                    bulkActionBar
                        .padding(.bottom, 16)
                }
            }
        }
    }

    // MARK: - Event Cell

    @ViewBuilder
    private func eventCell(for item: EventWithAvailability) -> some View {
        if isSelecting {
            Button {
                toggleSelection(item.event.id)
            } label: {
                EventRow(
                    item: item,
                    isSelecting: true,
                    isSelected: selectedEventIDs.contains(item.event.id)
                )
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        } else {
            NavigationLink(value: item.event.id) {
                EventRow(item: item) { status in
                    Task {
                        await dataService.setAvailability(
                            eventId: item.event.id,
                            rosterId: rosterID,
                            status: status
                        )
                    }
                }
            }
        }
    }

    // MARK: - Bulk Action Bar

    private var bulkActionBar: some View {
        HStack(spacing: 0) {
            Button {
                Task { await performBulkAvailability(status: .yes) }
            } label: {
                Label("Going", systemImage: "checkmark")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color("availabilityGreen"))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                    .contentShape(Rectangle())
            }

            Button {
                Task { await performBulkAvailability(status: .no) }
            } label: {
                Label("Not Going", systemImage: "xmark")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color("availabilityRed"))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                    .contentShape(Rectangle())
            }

            if captain.isCaptain {
                Button {
                    showBulkDeleteAlert = true
                } label: {
                    Image(systemName: "trash")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.red)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 16)
                        .contentShape(Rectangle())
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(isBulkActionLoading)
        .padding(.horizontal, 12)
        .modifier(GlassCapsuleModifier())
    }

    // MARK: - Actions

    private func toggleSelection(_ id: UUID) {
        if selectedEventIDs.contains(id) {
            selectedEventIDs.remove(id)
        } else {
            selectedEventIDs.insert(id)
        }
    }

    private func exitSelectionMode() {
        isSelecting = false
        selectedEventIDs.removeAll()
    }

    private func performBulkAvailability(status: AvailabilityStatus) async {
        isBulkActionLoading = true
        defer { isBulkActionLoading = false }
        await dataService.bulkSetAvailability(
            eventIds: Array(selectedEventIDs),
            rosterId: rosterID,
            status: status
        )
        exitSelectionMode()
    }

    private func performBulkDelete() async {
        isBulkActionLoading = true
        defer { isBulkActionLoading = false }
        await dataService.bulkDeleteEvents(eventIds: Array(selectedEventIDs))
        exitSelectionMode()
    }

    private func scrollToTodayIfNeeded(proxy: ScrollViewProxy) {
        guard !hasScrolledToToday, let target = todaySectionDate else { return }
        hasScrolledToToday = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation {
                proxy.scrollTo(target, anchor: .top)
            }
        }
    }

    private func loadData() async {
        await dataService.fetchCurrentSeason()
        if let season = dataService.currentSeason {
            await dataService.fetchEvents(seasonId: season.id)
            await dataService.fetchRoster(seasonId: season.id)
            await dataService.fetchAllAvailability(for: dataService.events.map(\.id))
            dataService.hasLoadedSchedule = true
        }
    }
}

/// Subtly fades and softens a row near the list's top and bottom edges.
/// Rows farther than `edgeZone` from both edges are left completely untouched.
private struct ScrollEdgeEffect: ViewModifier {
    let visibleFrame: CGRect
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        let visibleFrame = visibleFrame
        let isEnabled = !reduceMotion && !visibleFrame.isEmpty
        content.visualEffect { effect, geometry in
            let progress = isEnabled
                ? Self.edgeProgress(row: geometry.frame(in: .global), visibleFrame: visibleFrame)
                : 0
            return effect
                .opacity(1 - 0.35 * progress)
                .blur(radius: 0.5 * progress)
        }
    }

    /// 0 outside the edge zone, rising to 1 as the row reaches the edge.
    private nonisolated static func edgeProgress(row: CGRect, visibleFrame: CGRect) -> CGFloat {
        let edgeZone: CGFloat = 72
        let distanceToEdge = min(row.minY - visibleFrame.minY, visibleFrame.maxY - row.maxY)
        return min(max(1 - distanceToEdge / edgeZone, 0), 1)
    }
}

/// Applies `.glassEffect` on iOS 26+, falls back to `.ultraThinMaterial` on older.
private struct GlassCapsuleModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26, *) {
            content.glassEffect(.regular.interactive(), in: .capsule)
        } else {
            content.background(.ultraThinMaterial, in: .capsule)
        }
    }
}
