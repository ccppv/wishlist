import Combine
import Foundation

final class GuestSessionStore: ObservableObject {
    static let shared = GuestSessionStore()
    private let tokenKey = "wishlist_guest_session_token"
    private let displayNameKey = "wishlist_guest_display_name"
    private let lastGuestNameKey = "wishlist_last_guest_name"

    @Published private(set) var token: String?
    @Published private(set) var displayName: String?

    private init() {
        token = UserDefaults.standard.string(forKey: tokenKey)
        displayName = UserDefaults.standard.string(forKey: displayNameKey)
    }

    func setGuestSession(token: String, displayName: String) {
        self.token = token
        self.displayName = displayName
        UserDefaults.standard.set(token, forKey: tokenKey)
        UserDefaults.standard.set(displayName, forKey: displayNameKey)
    }

    func setToken(_ t: String?, displayName: String? = nil) {
        token = t
        if let t = t {
            UserDefaults.standard.set(t, forKey: tokenKey)
            if let dn = displayName {
                self.displayName = dn
                UserDefaults.standard.set(dn, forKey: displayNameKey)
            }
        } else {
            UserDefaults.standard.removeObject(forKey: tokenKey)
            UserDefaults.standard.removeObject(forKey: displayNameKey)
            self.displayName = nil
        }
    }

    var lastGuestName: String? {
        get { UserDefaults.standard.string(forKey: lastGuestNameKey) }
        set { UserDefaults.standard.set(newValue, forKey: lastGuestNameKey) }
    }

    func clear() {
        if let dn = displayName { lastGuestName = dn }
        setToken(nil)
    }
}
