import Foundation

struct Friendship: Codable {
    let id: Int
    let status: FriendshipStatus
    let friend: UserPublic
    let requestedAt: String
    let acceptedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, status, friend
        case requestedAt = "requested_at"
        case acceptedAt = "accepted_at"
    }
}

enum FriendshipStatus: String, Codable, CaseIterable {
    case pending
    case accepted
    case blocked
}
