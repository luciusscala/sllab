import SwiftUI

/// Picks the screen from the session: nothing yet, the join flow, or the
/// team. `Session.current` is the one source of truth, so leaving a team,
/// signing out or deleting the account all land here and fall through.
struct ContentView: View {
    @Environment(Session.self) private var session
    @Environment(DataService.self) private var dataService
    @Environment(UpdateChecker.self) private var updateChecker
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if updateChecker.updateRequired {
                MandatoryUpdateView()
            } else if session.state == .loading {
                ProgressView()
            } else if session.state == .signedIn, let membership = session.displayed {
                MainTabView(membership: membership)
                    .id(membership.teamId)
            } else {
                // One branch for signed out and signed in without a team, so
                // signing in mid-flow doesn't rebuild the join screens.
                JoinFlowView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: session.current?.teamId)
        .task {
            await updateChecker.check()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                Task { await updateChecker.check() }
            }
        }
        .onChange(of: session.current?.teamId, initial: true) { _, teamId in
            dataService.currentTeamId = teamId
        }
    }
}

struct MainTabView: View {
    let membership: Membership

    private enum AppTab { case schedule, members, settings }

    @State private var tab: AppTab = .schedule
    @State private var scheduleReselections = 0

    /// The setter also runs when the tab already showing is tapped again,
    /// which is how Schedule knows to go back to today.
    private var selection: Binding<AppTab> {
        Binding(
            get: { tab },
            set: { newTab in
                if newTab == tab, newTab == .schedule { scheduleReselections += 1 }
                tab = newTab
            }
        )
    }

    var body: some View {
        TabView(selection: selection) {
            ScheduleView(membership: membership, tabReselections: scheduleReselections)
                .tabItem { Label("Schedule", systemImage: "calendar") }
                .tag(AppTab.schedule)
            if membership.isStaff {
                MembersView(membership: membership)
                    .tabItem { Label("Members", systemImage: "person.3") }
                    .tag(AppTab.members)
            }
            SettingsView(membership: membership)
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(AppTab.settings)
        }
        .tint(.white)
        .modifier(TabBarMinimizeModifier())
    }
}

/// Applies `.tabBarMinimizeBehavior` on iOS 26+, no-op on older versions.
private struct TabBarMinimizeModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26, *) {
            content.tabBarMinimizeBehavior(.onScrollDown)
        } else {
            content
        }
    }
}
