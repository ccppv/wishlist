//
//  wishlist_App.swift
//  wishlistе
//

import SwiftUI

@main
struct wishlist_App: App {
    init() {
        APIClient.shared.setTokenProvider { guard let t = AuthStore.shared.token, !JWTValidator.isExpired(t) else { return nil }; return t }
        APIClient.shared.setRefreshHandler { (try? await AuthService.shared.refreshToken()) ?? false }
        if let user = AuthStore.shared.user, let token = AuthStore.shared.token {
            WebSocketService.shared.connect(userId: user.id, token: token)
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(AuthStore.shared)
        }
    }
}
