import Foundation

struct UsersAPI {
    private let client = APIClient.shared

    func me() async throws -> User {
        try await client.request("/users/me")
    }

    func updateMe(fullName: String?, avatarData: Data?, avatarFilename: String?) async throws -> User {
        var fields: [String: String] = [:]
        if let n = fullName { fields["full_name"] = n }
        if let data = avatarData, let name = avatarFilename, !name.isEmpty {
            print("[UsersAPI] updateMe: PATCH /users/me multipart full_name=\(fullName ?? "nil") avatar=\(data.count) bytes")
            return try await client.request(
                "/users/me",
                method: "PATCH",
                formFields: fields,
                formFile: ("avatar", name, data, "image/jpeg")
            )
        }
        if let n = fullName {
            print("[UsersAPI] updateMe: PATCH /users/me/json full_name='\(n)'")
            struct UpdateBody: Encodable { let fullName: String; enum CodingKeys: String, CodingKey { case fullName = "full_name" } }
            return try await client.request("/users/me/json", method: "PATCH", body: UpdateBody(fullName: n))
        }
        print("[UsersAPI] updateMe: no changes, calling me()")
        return try await me()
    }

    func deleteMe() async throws {
        let _: EmptyResponse = try await client.request("/users/me", method: "DELETE")
    }

    func search(q: String) async throws -> [User] {
        try await client.request("/users/search", query: ["query": q])
    }

    func getByUsername(_ username: String) async throws -> User {
        try await client.request("/users/\(username)")
    }

    func wishlists(username: String) async throws -> [WishlistSummary] {
        try await client.request("/users/\(username)/wishlists")
    }
}
