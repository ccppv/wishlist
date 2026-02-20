import SwiftUI

struct UserSearchView: View {
    var onSentRequest: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [User] = []
    @State private var isSearching = false
    @State private var errorMessage: String?
    @State private var sendingId: Int?
    @State private var userStatuses: [Int: String] = [:]
    @State private var requestedByMe: [Int: Bool] = [:]

    private let usersAPI = UsersAPI()
    private let friendsAPI = FriendshipsAPI()

    var body: some View {
        NavigationStack {
            List {
                Section {
                    TextField("Поиск по имени пользователя", text: $query)
                        .textContentType(.username)
                        .autocapitalization(.none)
                        .onSubmit { search() }
                }
                if let err = errorMessage {
                    Section { Text(err).foregroundStyle(.red) }
                }
                Section("Результаты") {
                    ForEach(results, id: \.id) { user in
                        HStack {
                            NavigationLink(value: user) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(user.fullName ?? user.username).font(.headline)
                                    Text("@\(user.username)").font(.caption).foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                            if sendingId == user.id {
                                ProgressView()
                            } else {
                                friendshipStatusButton(for: user)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(GrainyBackgroundView())
            .navigationTitle("Найти друга")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Закрыть") { dismiss() }
                }
            }
            .onChange(of: query) { _, _ in
                if query.count >= 2 {
                    search()
                } else {
                    results = []
                    userStatuses = [:]
                    requestedByMe = [:]
                }
            }
            .navigationDestination(for: User.self) { user in
                UserProfileView(username: user.username)
            }
        }
    }

    private func search() {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        isSearching = true
        errorMessage = nil
        Task {
            do {
                let users = try await usersAPI.search(q: q)
                await MainActor.run { results = users }
                var statuses: [Int: String] = [:]
                var byMe: [Int: Bool] = [:]
                for user in users {
                    if let s = try? await friendsAPI.status(userId: user.id) {
                        statuses[user.id] = s.status
                        byMe[user.id] = s.requestedByMe ?? false
                    }
                }
                await MainActor.run {
                    userStatuses = statuses
                    requestedByMe = byMe
                }
            } catch {
                await MainActor.run {
                    errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
                }
            }
            await MainActor.run { isSearching = false }
        }
    }

    @ViewBuilder
    private func friendshipStatusButton(for user: User) -> some View {
        let status = userStatuses[user.id] ?? "none"
        let byMe = requestedByMe[user.id] ?? false
        if status == "accepted" {
            Text("В друзьях").font(.caption).foregroundStyle(.secondary)
        } else if status == "pending" && byMe {
            Text("Заявка отправлена").font(.caption).foregroundStyle(.secondary)
        } else if status == "self" {
            Text("Вы").font(.caption).foregroundStyle(.secondary)
        } else {
            Button("Добавить") { sendRequest(friendId: user.id) }
                .buttonStyle(.bordered)
        }
    }

    private func sendRequest(friendId: Int) {
        sendingId = friendId
        Task {
            do {
                _ = try await friendsAPI.sendRequest(friendId: friendId)
                await MainActor.run {
                    userStatuses[friendId] = "pending"
                    requestedByMe[friendId] = true
                }
                onSentRequest()
                dismiss()
            } catch APIError.server(_, let msg) {
                errorMessage = msg ?? "Не удалось отправить заявку"
            } catch {
                errorMessage = error.localizedDescription
            }
            sendingId = nil
        }
    }
}

extension User: Hashable {
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: User, rhs: User) -> Bool { lhs.id == rhs.id }
}

extension User: Identifiable {}
