import Foundation
import Combine

final class AuthStore: ObservableObject {
    static let shared = AuthStore()

    private let defaults = UserDefaults.standard
    private let tokenKey = "wishlist_jwt_token"

    @Published private(set) var token: String?
    @Published private(set) var user: User?

    var currentRoute: AppRoute {
        if token != nil {
            guard let u = user else { return .loading }
            return u.onboardingCompleted ? .main : .onboarding
        }
        if GuestSessionStore.shared.token != nil { return .main }
        return .unauthorized
    }

    var isAuthenticated: Bool { token != nil && user != nil }
    var isGuestMode: Bool { token == nil && GuestSessionStore.shared.token != nil }

    private var guestCancellable: AnyCancellable?

    private init() {
        let t = defaults.string(forKey: tokenKey)
        token = (t != nil && !t!.isEmpty) ? t : nil
        user = nil
        guestCancellable = GuestSessionStore.shared.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.objectWillChange.send() }
    }

    func setAuth(accessToken: String, user: User) {
        token = accessToken
        self.user = user
        defaults.set(accessToken, forKey: tokenKey)
    }

    func setUser(_ u: User) {
        user = u
    }

    func logout() {
        token = nil
        user = nil
        defaults.removeObject(forKey: tokenKey)
    }

    func logoutGuest() {
        GuestSessionStore.shared.clear()
    }
}
