import Foundation

struct WishlistsAPI {
    private let client = APIClient.shared

    func create(title: String, description: String?, wishlistType: String, eventName: String?, eventDate: String?, visibility: String, coverEmoji: String?, coverImageData: Data?, coverImageName: String?) async throws -> WishlistSummary {
        var fields: [String: String] = [
            "title": title,
            "wishlist_type": wishlistType,
            "visibility": visibility
        ]
        if let d = description { fields["description"] = d }
        if let e = eventName { fields["event_name"] = e }
        if let ed = eventDate { fields["event_date"] = ed }
        if let em = coverEmoji { fields["cover_emoji"] = em }

        if let data = coverImageData, let name = coverImageName, !name.isEmpty {
            let response: WishlistSummary = try await client.request(
                "/wishlists/",
                method: "POST",
                formFields: fields,
                formFile: ("cover_image", name, data, "image/jpeg")
            )
            return response
        }
        return try await client.request("/wishlists/", method: "POST", formFields: fields)
    }

    func list(includeArchived: Bool = false) async throws -> [WishlistSummary] {
        try await client.request("/wishlists/", query: ["include_archived": includeArchived ? "true" : "false"])
    }

    func get(id: Int) async throws -> Wishlist {
        try await client.request("/wishlists/\(id)")
    }

    func getByShareToken(_ token: String) async throws -> Wishlist {
        guard let safe = URLValidation.safeShareToken(token) else { throw APIError.server(400, "Недопустимый токен") }
        return try await client.request("/wishlists/share/\(safe)")
    }

    func update(id: Int, update: WishlistUpdate) async throws -> WishlistSummary {
        try await client.request("/wishlists/\(id)", method: "PATCH", body: update)
    }

    func delete(id: Int) async throws {
        let _: EmptyResponse = try await client.request("/wishlists/\(id)", method: "DELETE")
    }

    func updateCoverImage(wishlistId: Int, imageData: Data, filename: String) async throws -> WishlistSummary {
        try await client.request(
            "/wishlists/\(wishlistId)/cover-image",
            method: "PATCH",
            formFields: [:],
            formFile: ("cover_image", filename, imageData, "image/jpeg")
        )
    }
}
