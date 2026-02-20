import Foundation

struct WSMessage: Decodable, Sendable {
    let type: String?
    let action: String?
    let status: String?
    let wishlistId: Int?
    let itemId: Int?
    let fromUserId: Int?
    let fromUsername: String?
    let friendshipId: Int?
    let ownerId: Int?
    let title: String?

    enum CodingKeys: String, CodingKey {
        case type, action, status, title
        case wishlistId = "wishlist_id"
        case itemId = "item_id"
        case fromUserId = "from_user_id"
        case fromUsername = "from_username"
        case friendshipId = "friendship_id"
        case ownerId = "owner_id"
    }
}

protocol WebSocketDelegate: AnyObject {
    func webSocket(_ service: WebSocketService, didReceive message: WSMessage)
    func webSocketDidDisconnect(_ service: WebSocketService)
}

final class WebSocketService {
    static let shared = WebSocketService()
    weak var delegate: WebSocketDelegate?
    private var task: URLSessionWebSocketTask?
    private var pingTimer: Timer?
    private var reconnectDelay: TimeInterval = 3
    private var maxReconnectAttempts = 10
    private var reconnectAttempts = 0
    private var isIntentionallyClosed = false
    private var wsBaseURL: String {
        let base = NetworkConfig.baseURLString
        return base.hasSuffix("/api/v1") ? String(base.dropLast(8)) : base.replacingOccurrences(of: "/api/v1", with: "")
    }

    private init() {}

    func connect(userId: Int, token: String) {
        isIntentionallyClosed = false
        reconnectAttempts = 0
        let base = wsBaseURL
        let scheme = base.hasPrefix("https") ? "wss" : "ws"
        let host = base
            .replacingOccurrences(of: "https://", with: "", options: [])
            .replacingOccurrences(of: "http://", with: "", options: [])
        let path = "/api/v1/ws/\(userId)"
        let encoded = token.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? token
        let urlString = "\(scheme)://\(host)\(path)?token=\(encoded)"
        guard let url = URL(string: urlString) else { return }
        let request = URLRequest(url: url)
        task = URLSession.shared.webSocketTask(with: request)
        task?.resume()
        startPing()
        receiveLoop()
    }

    func disconnect() {
        isIntentionallyClosed = true
        pingTimer?.invalidate()
        pingTimer = nil
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }

    private func startPing() {
        pingTimer?.invalidate()
        pingTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.sendPing()
        }
        pingTimer?.tolerance = 5
        RunLoop.main.add(pingTimer!, forMode: .common)
    }

    private func sendPing() {
        let msg = URLSessionWebSocketTask.Message.string("{\"type\":\"ping\"}")
        task?.send(msg) { _ in }
    }

    private func receiveLoop() {
        task?.receive { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    if let data = text.data(using: .utf8) {
                        Task { @MainActor in
                            let decoder = JSONDecoder()
                            decoder.keyDecodingStrategy = .convertFromSnakeCase
                            if let decoded = try? decoder.decode(WSMessage.self, from: data) {
                                self.delegate?.webSocket(self, didReceive: decoded)
                            }
                        }
                    }
                case .data: break
                @unknown default: break
                }
                if !self.isIntentionallyClosed {
                    self.receiveLoop()
                }
            case .failure:
                if !self.isIntentionallyClosed {
                    DispatchQueue.main.async {
                        self.delegate?.webSocketDidDisconnect(self)
                    }
                    self.tryReconnect()
                }
            }
        }
    }

    private func tryReconnect() {
        guard reconnectAttempts < maxReconnectAttempts,
              let user = AuthStore.shared.user,
              let token = AuthStore.shared.token else { return }
        reconnectAttempts += 1
        let delay = min(reconnectDelay * pow(2, Double(reconnectAttempts - 1)), 30)
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.connect(userId: user.id, token: token)
        }
    }
}
