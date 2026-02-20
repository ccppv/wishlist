import SwiftUI

struct UserProfileView: View {
    let username: String
    var initialFriendshipId: Int?

    @State private var profileUser: User?
    @State private var wishlists: [WishlistSummary] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var friendshipStatus: String?
    @State private var friendshipId: Int?
    @State private var requestedByMe: Bool = false
    @State private var friendshipActionInProgress = false

    private let usersAPI = UsersAPI()
    private let friendsAPI = FriendshipsAPI()

    var body: some View {
        Group {
            if isLoading && profileUser == nil {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let u = profileUser {
                ScrollView {
                    VStack(spacing: 0) {
                        HStack(spacing: 16) {
                            if let url = ImageURLHelper.fullURL(for: u.avatarUrl) {
                                AsyncImage(url: url) { phase in
                                    switch phase {
                                    case .success(let img): img.resizable().scaledToFill()
                                    default: Color.gray.opacity(0.2)
                                    }
                                }
                                .frame(width: 60, height: 60)
                                .clipShape(Circle())
                            }
                            VStack(alignment: .leading, spacing: 2) {
                                Text(u.fullName ?? u.username).font(.headline)
                                Text("@\(u.username)").font(.subheadline).foregroundStyle(.secondary)
                            }
                            Spacer()
                            friendshipButton(for: u)
                        }
                        .padding(16)

                        if wishlists.isEmpty {
                            Text("Нет вишлистов")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 32)
                        } else {
                            LazyVGrid(columns: [GridItem(.flexible(minimum: 168)), GridItem(.flexible(minimum: 168))], spacing: 6) {
                                ForEach(wishlists, id: \.id) { w in
                                    NavigationLink(value: w) {
                                        WishlistCardView(summary: w)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(6)
                        }
                    }
                }
            } else if let err = errorMessage {
                Text(err).foregroundStyle(.secondary).padding()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(GrainyBackgroundView())
        .navigationTitle(username)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { load() }
        .navigationDestination(for: WishlistSummary.self) { w in
            WishlistDetailView(wishlistId: w.id, title: w.title)
        }
    }

    @ViewBuilder
    private func friendshipButton(for user: User) -> some View {
        let status = friendshipStatus ?? "none"
        if status == "self" {
            EmptyView()
        } else if friendshipActionInProgress {
            ProgressView()
        } else if status == "accepted" {
            Button("Удалить из друзей") { removeFriend() }
                .buttonStyle(FriendActionButtonStyle(isLight: true))
        } else if status == "pending" && requestedByMe {
            HStack(spacing: 6) {
                Text("Заявка отправлена").font(.subheadline).foregroundStyle(.secondary)
                Button { withdrawRequest() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
        } else if status == "pending" && !requestedByMe {
            Button("Принять") { acceptFriend() }
                .buttonStyle(FriendActionButtonStyle(isLight: true))
        } else {
            Button("Добавить в друзья") { addFriend(userId: user.id) }
                .buttonStyle(FriendActionButtonStyle(isLight: true))
        }
    }

    private func addFriend(userId: Int) {
        friendshipActionInProgress = true
        Task {
            do {
                let result = try await friendsAPI.sendRequest(friendId: userId)
                await MainActor.run {
                    friendshipStatus = result.status.rawValue
                    friendshipId = result.id
                    requestedByMe = true
                }
            } catch {
                if case .server(let code, _) = error as? APIError, code == 400 || code == 422 {
                    await MainActor.run { loadFriendshipStatus(userId: userId) }
                } else {
                    errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
                }
            }
            await MainActor.run { friendshipActionInProgress = false }
        }
    }

    private func acceptFriend() {
        guard let fid = friendshipId else { return }
        friendshipActionInProgress = true
        Task {
            do {
                _ = try await friendsAPI.update(id: fid, status: "accepted")
                await MainActor.run {
                    friendshipStatus = "accepted"
                }
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            await MainActor.run { friendshipActionInProgress = false }
        }
    }

    private func withdrawRequest() {
        guard let fid = friendshipId else { return }
        friendshipActionInProgress = true
        Task {
            do {
                try await friendsAPI.delete(id: fid)
                await MainActor.run {
                    friendshipStatus = "none"
                    friendshipId = nil
                    requestedByMe = false
                }
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            await MainActor.run { friendshipActionInProgress = false }
        }
    }

    private func removeFriend() {
        guard let fid = friendshipId else { return }
        friendshipActionInProgress = true
        Task {
            do {
                try await friendsAPI.delete(id: fid)
                await MainActor.run {
                    friendshipStatus = "none"
                    friendshipId = nil
                    requestedByMe = false
                    NotificationCenter.default.post(name: .friendListDidChange, object: nil)
                }
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            await MainActor.run { friendshipActionInProgress = false }
        }
    }

    private func loadFriendshipStatus(userId: Int) {
        Task {
            if let s = try? await friendsAPI.status(userId: userId) {
                await MainActor.run {
                    friendshipStatus = s.status ?? "none"
                    friendshipId = s.friendshipId ?? initialFriendshipId
                    requestedByMe = s.requestedByMe ?? false
                }
            }
        }
    }

    private func load() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                async let u = usersAPI.getByUsername(username)
                async let wl = usersAPI.wishlists(username: username)
                let user = try await u
                profileUser = user
                wishlists = try await wl
                if let s = try? await friendsAPI.status(userId: user.id) {
                    await MainActor.run {
                        friendshipStatus = s.status ?? "none"
                        friendshipId = s.friendshipId ?? initialFriendshipId
                        requestedByMe = s.requestedByMe ?? false
                    }
                }
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            isLoading = false
        }
    }
}

private struct FriendActionButtonStyle: ButtonStyle {
    var isLight: Bool = true
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .foregroundStyle(isLight ? Color.primary : .white)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isLight ? Color(.systemGray5) : Color.accentColor)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
