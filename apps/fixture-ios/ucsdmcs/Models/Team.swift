import Foundation

struct Team: Identifiable, Codable, Hashable {
    let id: UUID
    let name: String
    let logoPath: String?
    let dataAlias: String?
    let orgId: UUID?
    let sportId: UUID?
    let division: String?

    enum CodingKeys: String, CodingKey {
        case id, name, division
        case logoPath = "logo_path"
        case dataAlias = "data_alias"
        case orgId = "org_id"
        case sportId = "sport_id"
    }
}
