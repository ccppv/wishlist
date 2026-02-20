import Foundation

struct FriendshipCreate: Encodable {
    let friendId: Int

    enum CodingKeys: String, CodingKey {
        case friendId = "friend_id"
    }
}

struct FriendshipUpdate: Encodable {
    let status: String
}

struct FriendshipStatusResponse: Codable {
    let status: String?
    let friendshipId: Int?
    let requestedByMe: Bool?

    enum CodingKeys: String, CodingKey {
        case status
        case friendshipId = "friendship_id"
        case requestedByMe = "requested_by_me"
    }
}

struct FriendshipCounts: Codable {
    let friends: Int
    let pendingReceived: Int
    let pendingSent: Int

    enum CodingKeys: String, CodingKey {
        case friends
        case pendingReceived = "pending_received"
        case pendingSent = "pending_sent"
    }
}
