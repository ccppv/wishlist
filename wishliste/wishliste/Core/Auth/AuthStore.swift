import Foundation
import Combine

final class AuthStore: ObservableObject {
    static let shared = AuthStore()

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

    var refreshToken: String? { KeychainService.load(for: .jwtRefreshToken) }

    private init() {
        if let kc = KeychainService.load(for: .jwtToken), !kc.isEmpty {
            token = kc
        } else if let ud = UserDefaults.standard.string(forKey: "wishlist_jwt_token"), !ud.isEmpty {
            token = ud
            _ = KeychainService.save(ud, for: .jwtToken)
            UserDefaults.standard.removeObject(forKey: "wishlist_jwt_token")
        } else {
            token = nil
        }
        user = nil
        guestCancellable = GuestSessionStore.shared.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.objectWillChange.send() }
    }

    func setAuth(accessToken: String, refreshToken: String? = nil, user: User) {
        token = accessToken
        self.user = user
        _ = KeychainService.save(accessToken, for: .jwtToken)
        if let rt = refreshToken {
            _ = KeychainService.save(rt, for: .jwtRefreshToken)
        } else {
            _ = KeychainService.delete(.jwtRefreshToken)
        }
    }

    func setUser(_ u: User) {
        user = u
    }

    func logout() {
        token = nil
        user = nil
        _ = KeychainService.delete(.jwtToken)
        _ = KeychainService.delete(.jwtRefreshToken)
    }

    func logoutGuest() {
        GuestSessionStore.shared.clear()
    }
}
