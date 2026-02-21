import Combine
import Foundation

final class GuestSessionStore: ObservableObject {
    static let shared = GuestSessionStore()

    @Published private(set) var token: String?
    @Published private(set) var displayName: String?

    private init() {
        if let kc = KeychainService.load(for: .guestToken), !kc.isEmpty {
            let createdAt = KeychainService.load(for: .guestTokenCreatedAt).flatMap { Double($0) }.map { Date(timeIntervalSince1970: $0) }
            let expiresAt = createdAt.map { Calendar.current.date(byAdding: .day, value: 90, to: $0) }
            if expiresAt == nil || (expiresAt != nil && Date() < expiresAt!) {
                token = kc
                displayName = KeychainService.load(for: .guestDisplayName)
            } else {
                _ = KeychainService.delete(.guestToken)
                _ = KeychainService.delete(.guestDisplayName)
                _ = KeychainService.delete(.guestTokenCreatedAt)
                token = nil
                displayName = nil
            }
        } else if let udToken = UserDefaults.standard.string(forKey: "wishlist_guest_session_token"), !udToken.isEmpty {
            token = udToken
            displayName = UserDefaults.standard.string(forKey: "wishlist_guest_display_name")
            _ = KeychainService.save(udToken, for: .guestToken)
            if let dn = displayName { _ = KeychainService.save(dn, for: .guestDisplayName) }
            UserDefaults.standard.removeObject(forKey: "wishlist_guest_session_token")
            UserDefaults.standard.removeObject(forKey: "wishlist_guest_display_name")
        } else {
            token = nil
            displayName = nil
        }
    }

    func setGuestSession(token: String, displayName: String) {
        self.token = token
        self.displayName = displayName
        _ = KeychainService.save(token, for: .guestToken)
        _ = KeychainService.save(displayName, for: .guestDisplayName)
        _ = KeychainService.save("\(Date().timeIntervalSince1970)", for: .guestTokenCreatedAt)
    }

    func setToken(_ t: String?, displayName: String? = nil) {
        token = t
        if let t = t {
            _ = KeychainService.save(t, for: .guestToken)
            _ = KeychainService.save("\(Date().timeIntervalSince1970)", for: .guestTokenCreatedAt)
            if let dn = displayName {
                self.displayName = dn
                _ = KeychainService.save(dn, for: .guestDisplayName)
            }
        } else {
            _ = KeychainService.delete(.guestToken)
            _ = KeychainService.delete(.guestDisplayName)
            _ = KeychainService.delete(.guestTokenCreatedAt)
            self.displayName = nil
        }
    }

    var lastGuestName: String? {
        get {
            if let kc = KeychainService.load(for: .lastGuestName) { return kc }
            let ud = UserDefaults.standard.string(forKey: "wishlist_last_guest_name")
            if let ud = ud {
                _ = KeychainService.save(ud, for: .lastGuestName)
                UserDefaults.standard.removeObject(forKey: "wishlist_last_guest_name")
            }
            return ud
        }
        set {
            if let v = newValue {
                _ = KeychainService.save(v, for: .lastGuestName)
            } else {
                _ = KeychainService.delete(.lastGuestName)
            }
        }
    }

    func clear() {
        if let dn = displayName { lastGuestName = dn }
        setToken(nil)
    }
}
