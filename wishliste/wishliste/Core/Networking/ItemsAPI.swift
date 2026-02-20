import Foundation

struct ItemsAPI {
    private let client = APIClient.shared

    func uploadImage(data: Data, filename: String) async throws -> String {
        let response: UploadImageResponse = try await client.request(
            "/items/upload-image",
            method: "POST",
            formFields: [:],
            formFile: ("file", filename, data, "image/jpeg")
        )
        return response.url
    }

    func create(wishlistId: Int, item: ItemCreate) async throws -> Item {
        let body = item.bodyForRequest()
        return try await client.request("/items?wishlist_id=\(wishlistId)", method: "POST", body: body)
    }

    func list(wishlistId: Int) async throws -> [Item] {
        try await client.request("/items", query: ["wishlist_id": "\(wishlistId)"])
    }

    func myReservations() async throws -> [ReservedItemDetail] {
        try await client.request("/items/my-reservations")
    }

    func myReservationsGuest() async throws -> [ReservedItemDetail] {
        var headers: [String: String] = [:]
        if let gt = GuestSessionStore.shared.token {
            headers["X-Guest-Session-Token"] = gt
        }
        return try await client.request("/items/my-reservations-guest", extraHeaders: headers)
    }

    func get(id: Int) async throws -> Item {
        try await client.request("/items/\(id)")
    }

    func update(id: Int, update: ItemUpdate) async throws -> Item {
        try await client.request("/items/\(id)", method: "PATCH", body: update)
    }

    func delete(id: Int) async throws {
        let _: EmptyResponse = try await client.request("/items/\(id)", method: "DELETE")
    }

    func reserve(itemId: Int, amount: Double?, name: String?) async throws -> Item {
        let body = ReserveRequest(amount: amount, name: name)
        var headers: [String: String] = [:]
        if let gt = GuestSessionStore.shared.token {
            headers["X-Guest-Session-Token"] = gt
        }
        let result: (Item, HTTPURLResponse) = try await client.requestReturningResponse("/items/\(itemId)/reserve", method: "POST", body: body, extraHeaders: headers)
        let item = result.0
        let response = result.1
        if let token = response.value(forHTTPHeaderField: "X-Guest-Session-Token") {
            GuestSessionStore.shared.setToken(token, displayName: name)
        }
        return item
    }

    func unreserve(itemId: Int, name: String? = nil) async throws -> Item {
        var q: [String: String] = [:]
        if let n = name { q["name"] = n }
        var headers: [String: String] = [:]
        if let gt = GuestSessionStore.shared.token {
            headers["X-Guest-Session-Token"] = gt
        }
        return try await client.request("/items/\(itemId)/reserve", method: "DELETE", query: q, extraHeaders: headers)
    }

    func copyToWishlist(itemId: Int, targetWishlistId: Int) async throws -> Item {
        let body = ItemCopyRequest(targetWishlistId: targetWishlistId)
        return try await client.request("/items/\(itemId)/copy-to-wishlist", method: "POST", body: body)
    }

    func parseUrl(_ url: String) async throws -> ParsedProductData {
        let body = ParseUrlRequest(url: url)
        return try await client.request("/items/parse-url", method: "POST", body: body)
    }
}
