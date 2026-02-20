import Foundation

struct Wishlist: Codable, Equatable {
    let id: Int
    let ownerId: Int
    var title: String
    var description: String?
    var coverImageUrl: String?
    var coverEmoji: String?
    var wishlistType: WishlistType
    var eventName: String?
    var eventDate: String?
    var visibility: Visibility
    let shareToken: String
    var isArchived: Bool
    let createdAt: String
    var updatedAt: String?
    var items: [Item]?
    var itemsCount: Int?

    enum CodingKeys: String, CodingKey {
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
        case items
        case itemsCount = "items_count"
    }
}

enum WishlistType: String, Codable, CaseIterable {
    case permanent
    case event
}

enum Visibility: String, Codable, CaseIterable {
    case `public`
    case byLink = "by_link"
    case friendsOnly = "friends_only"
}
