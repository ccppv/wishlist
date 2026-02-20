import SwiftUI

struct FriendsListView: View {
    @State private var list: [Friendship] = []
    @State private var requests: [Friendship] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showSearch = false

    private let api = FriendshipsAPI()

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && list.isEmpty && requests.isEmpty {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if list.isEmpty && requests.isEmpty {
                    ContentUnavailableView(
                        "Нет друзей",
                        systemImage: "person.2",
                        description: Text("Найдите друзей, чтобы добавить их в список")
                    )
                } else {
                    List {
                        if !requests.isEmpty {
                            Section("Заявки в друзья") {
                                ForEach(requests, id: \.id) { f in
                                    FriendRequestRow(friendship: f, onAccept: { accept(f) }, onDecline: { decline(f) })
                                }
                            }
                        }
                        Section("Друзья") {
                            ForEach(list, id: \.id) { f in
                                NavigationLink(value: f) {
                                    HStack {
                                        Text(f.friend.fullName ?? f.friend.username)
                                        Text("@\(f.friend.username)").font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(GrainyBackgroundView())
            .navigationTitle("Друзья")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showSearch = true }) {
                        Image(systemName: "person.badge.plus")
                    }
                }
            }
            .refreshable { load() }
            .onAppear { load() }
            .onReceive(NotificationCenter.default.publisher(for: .friendListDidChange)) { _ in load() }
            .sheet(isPresented: $showSearch) {
                UserSearchView(onSentRequest: {
                    showSearch = false
                    load()
                })
            }
            .navigationDestination(for: UserPublic.self) { user in
                UserProfileView(username: user.username)
            }
            .navigationDestination(for: Friendship.self) { f in
                UserProfileView(username: f.friend.username, initialFriendshipId: f.id)
            }
        }
    }

    private func load() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                async let friends = api.list()
                async let reqs = api.requests()
                let f = try await friends
                let r = try await reqs
                await MainActor.run {
                    list = f
                    requests = r
                }
            } catch APIError.unauthorized {
                await MainActor.run { AuthStore.shared.logout() }
            } catch {
                await MainActor.run {
                    errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
                }
            }
            await MainActor.run { isLoading = false }
        }
    }

    private func accept(_ f: Friendship) {
        Task {
            _ = try? await api.update(id: f.id, status: "accepted")
            load()
        }
    }

    private func decline(_ f: Friendship) {
        Task {
            try? await api.delete(id: f.id)
            load()
        }
    }
}

struct FriendRequestRow: View {
    let friendship: Friendship
    let onAccept: () -> Void
    let onDecline: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(friendship.friend.fullName ?? friendship.friend.username).font(.headline)
                Text("@\(friendship.friend.username)").font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Button("Принять") { onAccept() }.buttonStyle(.borderedProminent)
            Button("Отклонить", role: .destructive) { onDecline() }.buttonStyle(.bordered)
        }
        .padding(.vertical, 4)
    }
}

extension Friendship: Hashable {
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: Friendship, rhs: Friendship) -> Bool { lhs.id == rhs.id }
}

extension UserPublic: Hashable {
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: UserPublic, rhs: UserPublic) -> Bool { lhs.id == rhs.id }
}


extension Notification.Name {
    static let friendListDidChange = Notification.Name("friendListDidChange")
}
