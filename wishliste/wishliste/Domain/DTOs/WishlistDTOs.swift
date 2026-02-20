import Foundation

struct WishlistCreate: Encodable {
    let title: String
    let description: String?
    let wishlistType: String
    let eventName: String?
    let eventDate: String?
    let visibility: String
    let coverEmoji: String?

    enum CodingKeys: String, CodingKey {
        case title, description, visibility
        case wishlistType = "wishlist_type"
        case eventName = "event_name"
        case eventDate = "event_date"
        case coverEmoji = "cover_emoji"
    }
}

struct WishlistSummary: Codable {
    let id: Int
    let ownerId: Int
    var title: String
    var description: String?
    var coverImageUrl: String?
    var coverEmoji: String?
    var wishlistType: String
    var eventName: String?
    var eventDate: String?
    var visibility: String
    let shareToken: String
    var isArchived: Bool
    let createdAt: String
    var updatedAt: String?
    var itemsCount: Int

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        ownerId = try c.decode(Int.self, forKey: .ownerId)
        title = try c.decode(String.self, forKey: .title)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        coverImageUrl = try c.decodeIfPresent(String.self, forKey: .coverImageUrl)
        coverEmoji = try c.decodeIfPresent(String.self, forKey: .coverEmoji)
        wishlistType = try c.decode(String.self, forKey: .wishlistType)
        eventName = try c.decodeIfPresent(String.self, forKey: .eventName)
        eventDate = try c.decodeIfPresent(String.self, forKey: .eventDate)
        visibility = try c.decode(String.self, forKey: .visibility)
        shareToken = try c.decode(String.self, forKey: .shareToken)
        isArchived = try c.decode(Bool.self, forKey: .isArchived)
        createdAt = try c.decode(String.self, forKey: .createdAt)
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt)
        itemsCount = try c.decodeIfPresent(Int.self, forKey: .itemsCount) ?? 0
    }

    private enum CodingKeys: String, CodingKey {
        case id, title, description, visibility
        case ownerId = "owner_id"
        case coverImageUrl = "cover_image_url"
        case coverEmoji = "cover_emoji"
        case wishlistType = "wishlist_type"
        case eventName = "event_name"
        case eventDate = "event_date"
        case shareToken = "share_token"
        case isArchived = "is_archived"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case itemsCount = "items_count"
    }
}

struct WishlistUpdate: Encodable {
    var title: String?
    var description: String?
    var wishlistType: String?
    var eventName: String?
    var eventDate: String?
    var visibility: String?
    var isArchived: Bool?
    var coverEmoji: String?
}
