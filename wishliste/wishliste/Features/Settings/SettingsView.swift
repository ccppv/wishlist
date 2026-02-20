import SwiftUI

struct SettingsView: View {
    @State private var theme = AppTheme.shared
    @State private var showLogoutConfirm = false

    private let authStore = AuthStore.shared

    var body: some View {
        List {
            Section("Тема") {
                Picker("Оформление", selection: $theme.choice) {
                    Text("Системная").tag(ColorSchemeChoice.system)
                    Text("Светлая").tag(ColorSchemeChoice.light)
                    Text("Тёмная").tag(ColorSchemeChoice.dark)
                }
                .pickerStyle(.menu)
                .onChange(of: theme.choice) { _, _ in }
            }
            Section {
                Button("Выйти", role: .destructive) {
                    showLogoutConfirm = true
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(GrainyBackgroundView())
        .navigationTitle("Настройки")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Выйти из аккаунта?", isPresented: $showLogoutConfirm) {
            Button("Выйти", role: .destructive) {
                WebSocketService.shared.disconnect()
                authStore.logout()
            }
            Button("Отмена", role: .cancel) {}
        } message: {
            Text("Вы сможете снова войти с тем же логином и паролем.")
        }
    }
}
