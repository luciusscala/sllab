import SwiftUI

/// One event in the schedule. Two lines: what it is, in white, and when and
/// where, in grey. Games, socials and tournaments carry a small coloured
/// label above the title; practices, being most of the list, don't.
struct EventRow: View {
    let item: EventWithAvailability
    /// False for someone who can't respond (a guest, a coach): no status
    /// column at all rather than an empty one.
    var showsResponse: Bool = true
    var onQuickRespond: ((AvailabilityStatus) -> Void)?

    var body: some View {
        HStack(spacing: 12) {
            if item.event.eventType == "game", let logoURL = item.opponentLogoURL {
                AsyncImage(url: logoURL) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(AppTheme.surfaceRaised)
                        .overlay {
                            Text(String(item.game?.opponentName.prefix(3) ?? ""))
                                .sectionLabel()
                        }
                }
                .frame(width: 36, height: 36)
                .clipShape(.rect(cornerRadius: 6))
            }

            VStack(alignment: .leading, spacing: 3) {
                if let typeColor = AppTheme.eventColor(item.event.eventType) {
                    Text(item.event.typeLabel)
                        .sectionLabel(typeColor)
                }
                Text(item.title)
                    .font(.headline)
                    .foregroundStyle(AppTheme.text)
                    .lineLimit(1)
                Text(detail)
                    .font(.subheadline)
                    .monospacedDigit()
                    .foregroundStyle(AppTheme.textSecondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            if !showsResponse {
                EmptyView()
            } else if let status = item.currentRosterStatus {
                Image(systemName: status.icon)
                    .font(.title3)
                    .foregroundStyle(status.color)
            } else if let onQuickRespond {
                HStack(spacing: 8) {
                    Button {
                        onQuickRespond(.yes)
                    } label: {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(AvailabilityStatus.yes.color)
                    }
                    .buttonStyle(.plain)
                    Button {
                        onQuickRespond(.no)
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(AvailabilityStatus.no.color)
                    }
                    .buttonStyle(.plain)
                }
            } else {
                Image(systemName: "circle.dashed")
                    .font(.title3)
                    .foregroundStyle(AppTheme.textSecondary.opacity(0.5))
            }
        }
        .padding(.vertical, 4)
    }

    /// "7:00 PM · Muir Field"
    private var detail: String {
        let time = item.event.eventDate.formatted(.dateTime.hour().minute())
        guard let location = item.location else { return time }
        return "\(time) · \(location)"
    }
}
