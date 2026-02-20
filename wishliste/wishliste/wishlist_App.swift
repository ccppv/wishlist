//
//  wishlist_App.swift
//  wishlistе
//

import SwiftUI

@main
struct wishlist_App: App {
    init() {
        APIClient.shared.setTokenProvider { AuthStore.shared.token }
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
