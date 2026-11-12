import Foundation

/// What the roster shows about a person. Their phone number isn't here: it
/// lives in a table only the server reads.
struct Person: Identifiable, Codable, Hashable {
    let id: UUID
    let name: String
    let hometown: String?
    let picturePath: String?

    enum CodingKeys: String, CodingKey {
        case id, name, hometown
        case picturePath = "picture_path"
    }
}
