import SwiftUI

struct GuestProfileView: View {
    @State private var showLogoutConfirm = false
    private let authStore = AuthStore.shared
    private let guestStore = GuestSessionStore.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    VStack(spacing: 12) {
                        Image(systemName: "person.crop.circle.badge.questionmark")
                            .font(.system(size: 64))
                            .foregroundStyle(.secondary)
                        Text(guestStore.displayName ?? "Гость")
                            .font(.title2.bold())
                        Text("Сессия на 90 дней")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.top, 48)

                    VStack(spacing: 16) {
                        Text("Войдите для создания вишлистов, добавления друзей и полного доступа")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        NavigationLink(destination: LoginView()) {
                            Text("Войти или зарегистрироваться")
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding(.horizontal, 24)

                    Button(role: .destructive, action: { showLogoutConfirm = true }) {
                        Text("Выйти из гостевого режима")
                            .font(.subheadline)
                    }
                    .padding(.top, 24)
                }
            }
            .background(GrainyBackgroundView())
            .navigationTitle("Профиль")
            .navigationBarTitleDisplayMode(.inline)
            .confirmationDialog("Выйти из гостевого режима?", isPresented: $showLogoutConfirm) {
                Button("Выйти", role: .destructive) {
                    authStore.logoutGuest()
                }
                Button("Отмена", role: .cancel) {}
            } message: {
                Text("Ваши брони останутся, но вы не сможете просматривать их без повторного входа по ссылке.")
            }
        }
    }
}
