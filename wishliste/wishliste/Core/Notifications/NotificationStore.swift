import Foundation

struct FriendRequestNotification: Identifiable {
    let id: Int
    let fromUsername: String
    let friendshipId: Int
}

struct FriendAcceptedNotification: Identifiable {
    let id: String
    let fromUsername: String
}

@Observable
final class NotificationStore: WebSocketDelegate {
    static let shared = NotificationStore()
    var friendRequests: [FriendRequestNotification] = []
    var friendAccepted: [FriendAcceptedNotification] = []

    private init() {
        WebSocketService.shared.delegate = self
    }

    func webSocket(_ service: WebSocketService, didReceive message: WSMessage) {
        if message.type == "friend_request", message.action == "new",
           let fromUser = message.fromUsername,
           let fid = message.friendshipId {
            let n = FriendRequestNotification(id: fid, fromUsername: fromUser, friendshipId: fid)
            if !friendRequests.contains(where: { $0.id == fid }) {
                friendRequests.append(n)
            }
            return
        }
        if message.type == "friend_request", message.action == "updated", message.status == "accepted",
           let fromId = message.fromUserId, fromId != AuthStore.shared.user?.id,
           let fromUser = message.fromUsername {
            let n = FriendAcceptedNotification(id: "accepted-\(fromUser)-\(Date().timeIntervalSince1970)", fromUsername: fromUser)
            if !friendAccepted.contains(where: { $0.fromUsername == fromUser }) {
                friendAccepted.append(n)
            }
            return
        }
        if message.type == "friend_request", message.action == "deleted",
           let fid = message.friendshipId {
            friendRequests.removeAll { $0.friendshipId == fid }
            return
        }
        if message.type == "wishlist_item",
           let action = message.action,
           ["item_reserved", "item_unreserved"].contains(action) {
            var userInfo: [String: Any] = ["action": action]
            if let wid = message.wishlistId { userInfo["wishlist_id"] = wid }
            if let iid = message.itemId { userInfo["item_id"] = iid }
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: .itemReservationChanged, object: nil, userInfo: userInfo)
            }
        }
    }

    func webSocketDidDisconnect(_ service: WebSocketService) {}

    func clearFriendRequest(_ id: Int) {
        friendRequests.removeAll { $0.id == id }
    }

    func loadFromAPI() {
        Task {
            do {
                let reqs = try await FriendshipsAPI().requests()
                await MainActor.run {
                    friendRequests = reqs.map { FriendRequestNotification(id: $0.id, fromUsername: $0.friend.username, friendshipId: $0.id) }
                }
            } catch {
                #if DEBUG
                print("[NotificationStore] loadFromAPI failed: \(error)")
                #endif
            }
        }
    }
}

extension Notification.Name {
    static let itemReservationChanged = Notification.Name("itemReservationChanged")
}
