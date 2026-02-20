import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    private let authStore = AuthStore.shared

    var body: some View {
        TabView(selection: $selectedTab) {
            if authStore.isGuestMode {
                GiftsView()
                    .tabItem { Label("Подарки", systemImage: "gift") }
                    .tag(0)
                GuestOpenLinkView()
                    .tabItem { Label("Открыть", systemImage: "link") }
                    .tag(1)
                GuestProfileView()
                    .tabItem { Label("Профиль", systemImage: "person.circle") }
                    .tag(2)
            } else {
                WishlistsListView()
                    .tabItem { Label("Вишлисты", systemImage: "list.star") }
                    .tag(0)
                GiftsView()
                    .tabItem { Label("Подарки", systemImage: "gift") }
                    .tag(1)
                FriendsListView()
                    .tabItem { Label("Друзья", systemImage: "person.2") }
                    .tag(2)
                ProfileView()
                    .tabItem { Label("Профиль", systemImage: "person.circle") }
                    .tag(3)
            }
        }
    }
}
