import Foundation

struct ItemCreate: Encodable {
    let wishlistId: Int
    let title: String
    let description: String?
    let url: String?
    let images: [String]?
    let price: Decimal?
    let currency: String?
    let targetAmount: Decimal?
    let priority: String?

    enum CodingKeys: String, CodingKey {
        case title, description, url, images, price, currency, priority
        case wishlistId = "wishlist_id"
        case targetAmount = "target_amount"
    }

    func bodyForRequest() -> ItemCreateBody {
        ItemCreateBody(
            title: title,
            description: description,
            url: url,
            images: images,
            price: price,
            currency: currency,
            targetAmount: targetAmount,
            priority: priority
        )
    }
}

struct ItemCreateBody: Encodable {
    let title: String
    let description: String?
    let url: String?
    let images: [String]?
    let price: Decimal?
    let currency: String?
    let targetAmount: Decimal?
    let priority: String?

    enum CodingKeys: String, CodingKey {
        case title, description, url, images, price, currency, priority
        case targetAmount = "target_amount"
    }
}

struct ItemUpdate: Encodable {
    var title: String?
    var description: String?
    var url: String?
    var images: [String]?
    var price: Decimal?
    var currency: String?
    var targetAmount: Decimal?
    var priority: String?
    var positionOrder: Int?
}

struct ReserveRequest: Encodable {
    let amount: Double?
    let name: String?
}

struct ItemCopyRequest: Encodable {
    let targetWishlistId: Int

    enum CodingKeys: String, CodingKey {
        case targetWishlistId = "target_wishlist_id"
    }
}

struct UploadImageResponse: Codable {
    let url: String
}

struct ParseUrlRequest: Encodable {
    let url: String
}

struct ParsedProductData: Codable {
    let title: String?
    let description: String?
    let price: Decimal?
    let images: [String]?
}
