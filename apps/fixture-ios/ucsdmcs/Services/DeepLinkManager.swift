import Foundation

/// Links to an event, as Universal Links: `https://app.sllab.io/events/<id>`.
/// iOS opens them here when the app is installed and in Safari, on the web
/// team app's event page, when it isn't.
///
/// Building and reading the link live together so the two can't drift apart.
/// Each host's `/.well-known/apple-app-site-association` is what lets iOS
/// hand these links to the app.
@Observable
final class DeepLinkManager {
    private static let host = "app.sllab.io"

    /// Reminder texts sent before the team app moved to app.sllab.io link
    /// here. The entitlements still claim it, so those links keep opening.
    private static let formerHost = "app.ucsdmcs.com"

    /// Set when a link arrives; `ScheduleView` opens the event and clears it.
    var pendingEventID: UUID?

    static func eventURL(_ eventID: UUID) -> URL {
        URL(string: "https://\(host)/events/\(eventID.uuidString.lowercased())")!
    }

    func handle(url: URL) {
        // pathComponents of "/events/<id>" are ["/", "events", "<id>"].
        let path = url.pathComponents
        guard let host = url.host, host == Self.host || host == Self.formerHost,
              path.count >= 3, path[1] == "events",
              let eventID = UUID(uuidString: path[2]) else { return }
        pendingEventID = eventID
    }
}
