import SwiftUI

struct ProfileView: View {
    @EnvironmentObject private var authStore: AuthStore
    @Environment(\.colorScheme) private var colorScheme
    @State private var user: User?
    @State private var isLoading = true
    @State private var showEditProfile = false
    @State private var showQR = false
    @State private var showNotifications = false
    @State private var notificationStore = NotificationStore.shared

    private let usersAPI = UsersAPI()

    private var profileUrl: URL? {
        guard let u = user ?? authStore.user else { return nil }
        let base = NetworkConfig.baseURLString.replacingOccurrences(of: "/api/v1", with: "")
        return URL(string: "\(base)/u/\(u.username)")
    }

    var body: some View {
        NavigationStack {
            Group {
                if let u = user ?? authStore.user {
                    ScrollView {
                        VStack(spacing: 24) {
                            profileCard(u, colorScheme: colorScheme)
                        }
                        .padding()
                    }
                } else if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(GrainyBackgroundView())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { showQR = true } label: {
                        Image(systemName: "qrcode")
                    }
                    .buttonStyle(.plain)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(destination: SettingsView()) {
                        Image(systemName: "gearshape")
                    }
                    .buttonStyle(.plain)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showNotifications = true } label: {
                        ZStack(alignment: .topTrailing) {
                            Image(systemName: "bell")
                            if !notificationStore.friendRequests.isEmpty || !notificationStore.friendAccepted.isEmpty {
                                Circle()
                                    .fill(.red)
                                    .frame(width: 8, height: 8)
                                    .offset(x: 4, y: -4)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .refreshable { load() }
            .onAppear { load(); notificationStore.loadFromAPI() }
            .sheet(isPresented: $showEditProfile) {
                if let u = user ?? authStore.user {
                    EditProfileView(user: u, onSaved: { updatedUser in
                        user = updatedUser
                        showEditProfile = false
                        load()
                    })
                }
            }
            .sheet(isPresented: $showQR) {
                if let url = profileUrl {
                    ProfileQRSheet(profileUrl: url, onDismiss: { showQR = false })
                        .presentationDetents([.medium, .large])
                        .presentationDragIndicator(.visible)
                }
            }
            .sheet(isPresented: $showNotifications) {
                NotificationsSheet(onDismiss: { showNotifications = false })
            }
        }
    }

    @ViewBuilder
    private func profileCard(_ u: User, colorScheme: ColorScheme) -> some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                Group {
                    if let url = ImageURLHelper.fullURL(for: u.avatarUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let img): img.resizable().scaledToFill()
                            default: Color.clear
                            }
                        }
                    } else {
                        Image(systemName: "person")
                            .font(.system(size: 32))
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(width: 72, height: 72)
                .clipShape(Circle())
                .overlay(Circle().strokeBorder(Color(.systemGray4), lineWidth: 1))
                VStack(alignment: .leading, spacing: 4) {
                    Text(u.fullName ?? u.username).font(.title2.bold())
                    Text("@\(u.username)").font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
            }
            Button { showEditProfile = true } label: {
                Label("Редактировать", systemImage: "pencil")
                    .frame(maxWidth: .infinity)
                    .foregroundStyle(.white.opacity(0.95))
            }
            .buttonStyle(.borderedProminent)
            .buttonBorderShape(.roundedRectangle(radius: 12))
            .tint(Color(.systemGray4))
        }
        .padding(20)
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color(.systemGray4), lineWidth: 1))
    }

    private func load() {
        guard authStore.isAuthenticated else { return }
        Task { @MainActor in
            do {
                user = try await usersAPI.me()
            } catch APIError.unauthorized {
                authStore.logout()
            } catch { }
            isLoading = false
        }
    }
}

struct NotificationsSheet: View {
    var onDismiss: () -> Void

    @State private var store = NotificationStore.shared
    @State private var requests: [Friendship] = []

    private let api = FriendshipsAPI()

    var body: some View {
        NavigationStack {
            List {
                if requests.isEmpty && store.friendRequests.isEmpty && store.friendAccepted.isEmpty {
                    ContentUnavailableView(
                        "Нет уведомлений",
                        systemImage: "bell.slash",
                        description: Text("Здесь появятся заявки в друзья")
                    )
                } else {
                    Section("Заявки в друзья") {
                        ForEach(requests, id: \.id) { f in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("\(f.friend.fullName ?? f.friend.username) хочет добавить вас в друзья")
                                        .font(.subheadline)
                                    Text("@\(f.friend.username)").font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Button("Принять") { accept(f) }.buttonStyle(.borderedProminent)
                                Button("Отклонить", role: .destructive) { decline(f) }.buttonStyle(.bordered)
                            }
                        }
                    }
                    if !store.friendAccepted.isEmpty {
                        Section("Добавили вас в друзья") {
                            ForEach(store.friendAccepted, id: \.id) { n in
                                HStack {
                                    Text("@\(n.fromUsername) принял(а) вашу заявку в друзья")
                                        .font(.subheadline)
                                    Spacer()
                                }
                            }
                            .onDelete { idx in
                                for i in idx.sorted(by: >) {
                                    store.friendAccepted.remove(at: i)
                                }
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(GrainyBackgroundView())
            .navigationTitle("Уведомления")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Закрыть") { onDismiss() }
                }
            }
            .refreshable { await loadRequests() }
            .onAppear { Task { await loadRequests() } }
        }
    }

    private func loadRequests() async {
        do {
            let reqs = try await api.requests()
            await MainActor.run {
                requests = reqs
                store.friendRequests = reqs.map { FriendRequestNotification(id: $0.id, fromUsername: $0.friend.username, friendshipId: $0.id) }
            }
        } catch {}
    }

    private func accept(_ f: Friendship) {
        Task {
            _ = try? await api.update(id: f.id, status: "accepted")
            await MainActor.run {
                requests.removeAll { $0.id == f.id }
                store.clearFriendRequest(f.id)
            }
        }
    }

    private func decline(_ f: Friendship) {
        Task {
            try? await api.delete(id: f.id)
            await MainActor.run {
                requests.removeAll { $0.id == f.id }
                store.clearFriendRequest(f.id)
            }
        }
    }
}
