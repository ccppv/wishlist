import Foundation

struct FriendshipsAPI {
    private let client = APIClient.shared

    func sendRequest(friendId: Int) async throws -> Friendship {
        let body = FriendshipCreate(friendId: friendId)
        return try await client.request("/friendships/", method: "POST", body: body)
    }

    func requests() async throws -> [Friendship] {
        try await client.request("/friendships/requests")
    }

    func list() async throws -> [Friendship] {
        try await client.request("/friendships/")
    }

    func update(id: Int, status: String) async throws -> Friendship {
        let body = FriendshipUpdate(status: status)
        return try await client.request("/friendships/\(id)", method: "PATCH", body: body)
    }

    func delete(id: Int) async throws {
        let _: EmptyResponse = try await client.request("/friendships/\(id)", method: "DELETE")
    }

    func status(userId: Int) async throws -> FriendshipStatusResponse {
        try await client.request("/friendships/status/\(userId)")
    }

    func counts() async throws -> FriendshipCounts {
        try await client.request("/friendships/stats/counts")
    }
}
