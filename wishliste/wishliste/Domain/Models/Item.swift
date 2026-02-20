import Foundation

struct Item: Codable, Equatable, Identifiable {
    let id: Int
    let wishlistId: Int
    var title: String
    var description: String?
    var url: String?
    var imageUrl: String?
    var images: [String]?
    var price: Decimal?
    var currency: String
    var targetAmount: Decimal?
    var collectedAmount: Decimal
    var priority: Priority
    var isReserved: Bool
    var isPurchased: Bool
    var reservedByName: String?
    var contributors: [Contributor]?
    var contributionProgress: Double?
    var positionOrder: Int
    let createdAt: String
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, url, price, currency, priority
        case wishlistId = "wishlist_id"
        case imageUrl = "image_url"
        case images
        case targetAmount = "target_amount"
        case collectedAmount = "collected_amount"
        case isReserved = "is_reserved"
        case isPurchased = "is_purchased"
        case reservedByName = "reserved_by_name"
        case contributors
        case contributionProgress = "contribution_progress"
        case positionOrder = "position_order"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var primaryImageUrl: String? {
        (images?.first).flatMap { $0.isEmpty ? nil : $0 } ?? imageUrl
    }
}

struct Contributor: Codable, Equatable {
    let name: String
    let amount: Double
}

enum Priority: String, Codable, CaseIterable {
    case low
    case medium
    case high
}

struct WishlistInfo: Codable {
    let id: Int
    let title: String
    let eventDate: String?
    let wishlistType: String
    let ownerUsername: String
    let ownerFullname: String?

    enum CodingKeys: String, CodingKey {
        case id, title
        case eventDate = "event_date"
        case wishlistType = "wishlist_type"
        case ownerUsername = "owner_username"
        case ownerFullname = "owner_fullname"
    }
}

struct ReservedItemDetail: Codable {
    let id: Int
    let wishlistId: Int?
    var title: String
    var description: String?
    var url: String?
    var imageUrl: String?
    var images: [String]?
    var price: Decimal?
    var currency: String
    var collectedAmount: Decimal
    var isReserved: Bool
    var isPurchased: Bool
    var reservedByName: String?
    var contributors: [Contributor]?
    var positionOrder: Int
    let createdAt: String
    var updatedAt: String?
    var reservedAt: String?
    var wishlist: WishlistInfo?
    var myContribution: Double?
    var daysUntilEvent: Int?

    enum CodingKeys: String, CodingKey {
        case id, title, description, url, price, currency
        case wishlistId = "wishlist_id"
        case imageUrl = "image_url"
        case images
        case collectedAmount = "collected_amount"
        case isReserved = "is_reserved"
        case isPurchased = "is_purchased"
        case reservedByName = "reserved_by_name"
        case contributors
        case positionOrder = "position_order"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case reservedAt = "reserved_at"
        case wishlist
        case myContribution = "my_contribution"
        case daysUntilEvent = "days_until_event"
    }
}
