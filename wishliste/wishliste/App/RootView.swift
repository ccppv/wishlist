import SwiftUI

struct RootView: View {
    @EnvironmentObject var store: AuthStore
    @State private var theme = AppTheme.shared
    @State private var onboardingDone = false

    private var route: AppRoute {
        if store.currentRoute == .unauthorized || store.currentRoute == .loading {
            return store.currentRoute
        }
        if onboardingDone { return .main }
        return store.currentRoute
    }

    var body: some View {
        ZStack {
            GrainyBackgroundView()
            Group {
            switch route {
            case .unauthorized:
                LoginView()
            case .loading:
                VStack(spacing: 16) {
                    ProgressView("Загрузка...")
                    Button("Выйти") { store.logout() }
                        .padding(.top, 8)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .onboarding:
                OnboardingView(onDone: { onboardingDone = true })
            case .main:
                MainTabView()
            }
            }
        }
        .preferredColorScheme(theme.colorScheme)
        .onChange(of: store.currentRoute) { _, r in if r == .unauthorized { onboardingDone = false } }
        .task(id: store.token ?? "") {
            guard let token = store.token, !token.isEmpty else { return }
            do {
                let user = try await withThrowingTaskGroup(of: User.self) { group in
                    group.addTask { try await AuthService.shared.getMe() }
                    group.addTask {
                        try await Task.sleep(nanoseconds: 15_000_000_000)
                        throw NSError(domain: "timeout", code: -1, userInfo: [NSLocalizedDescriptionKey: "Таймаут подключения"])
                    }
                    guard let first = try await group.next() else { throw APIError.noData }
                    group.cancelAll()
                    return first
                }
                store.setUser(user)
                if let t = store.token {
                    _ = NotificationStore.shared
                    WebSocketService.shared.connect(userId: user.id, token: t)
                }
            } catch APIError.unauthorized {
                store.logout()
            } catch APIError.server(let code, _) where code == 401 || code == 403 {
                store.logout()
            } catch {
                store.logout()
            }
        }
    }
}
