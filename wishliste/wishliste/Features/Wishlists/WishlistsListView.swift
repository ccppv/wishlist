import SwiftUI

struct WishlistsListView: View {
    @State private var list: [WishlistSummary] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showCreate = false
    @State private var showOpenByLink = false
    @State private var linkTokenInput = ""
    @State private var openByToken: ShareTokenWrapper?
    @State private var editWishlist: WishlistSummary?
    @State private var deleteWishlist: WishlistSummary?
    @State private var shareUrl: ShareableURL?

    private let api = WishlistsAPI()

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && list.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = errorMessage {
                    VStack(spacing: 12) {
                        Text(err).foregroundStyle(.secondary).multilineTextAlignment(.center)
                        Button("Повторить") { load() }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if list.isEmpty {
                    ContentUnavailableView(
                        "Нет вишлистов",
                        systemImage: "list.star",
                        description: Text("Создайте первый список желаний")
                    )
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.flexible(minimum: 168)), GridItem(.flexible(minimum: 168))], spacing: 6) {
                            ForEach(list, id: \.id) { w in
                                NavigationLink(value: w) {
                                    WishlistCardView(summary: w, onShare: { share(w) }, onEdit: { editWishlist = w }, onDelete: { deleteWishlist = w })
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(6)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(GrainyBackgroundView())
            .navigationTitle("Вишлисты")
            .navigationDestination(for: WishlistSummary.self) { w in
                WishlistDetailView(wishlistId: w.id, title: w.title)
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showCreate = true }) {
                        Image(systemName: "plus.circle.fill")
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: { showOpenByLink = true }) {
                        Image(systemName: "link")
                    }
                }
            }
            .refreshable { load() }
            .onAppear { load() }
            .sheet(isPresented: $showCreate) {
                CreateWishlistView(onCreated: {
                    showCreate = false
                    load()
                })
            }
            .sheet(isPresented: $showOpenByLink) {
                OpenByLinkSheet(
                    tokenInput: $linkTokenInput,
                    onOpen: {
                        let raw = linkTokenInput.trimmingCharacters(in: .whitespaces)
                        guard !raw.isEmpty else { return }
                        openByToken = ShareTokenWrapper(token: extractShareToken(from: raw))
                        showOpenByLink = false
                    },
                    onCancel: { showOpenByLink = false }
                )
            }
            .fullScreenCover(item: $openByToken) { wrapper in
                PublicWishlistView(shareToken: wrapper.token, onDismiss: { openByToken = nil })
            }
            .sheet(item: $editWishlist) { w in
                EditWishlistView(summary: w, onSaved: {
                    editWishlist = nil
                    load()
                })
            }
            .sheet(item: $shareUrl) { item in
                ShareSheet(activityItems: [item.url])
            }
            .alert(item: $deleteWishlist) { w in
                Alert(
                    title: Text("Удалить вишлист?"),
                    message: Text("Вишлист «\(w.title)» будет удалён."),
                    primaryButton: .destructive(Text("Удалить")) { performDelete() },
                    secondaryButton: .cancel(Text("Отмена")) { deleteWishlist = nil }
                )
            }
        }
    }

    private func share(_ w: WishlistSummary) {
        let base = NetworkConfig.baseURLString.replacingOccurrences(of: "/api/v1", with: "")
        if let url = URL(string: "\(base)/wl/\(w.shareToken)") {
            shareUrl = ShareableURL(id: url.absoluteString, url: url)
        }
    }

    private func performDelete() {
        guard let w = deleteWishlist else { return }
        Task {
            try? await api.delete(id: w.id)
            await MainActor.run {
                deleteWishlist = nil
                load()
            }
        }
    }

    private func extractShareToken(from input: String) -> String {
        if input.contains("/wl/") {
            let parts = input.components(separatedBy: "/wl/")
            if parts.count > 1 {
                let after = parts[1]
                if let q = after.firstIndex(of: "?") {
                    return String(after[..<q])
                }
                return after
            }
        }
        return input
    }

    private func load() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                list = try await api.list(includeArchived: false)
            } catch APIError.unauthorized {
                AuthStore.shared.logout()
            } catch let e as APIError {
                errorMessage = e.errorDescription
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

private struct ShareableURL: Identifiable {
    let id: String
    let url: URL
}

private struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }
    func updateUIViewController(_: UIActivityViewController, context: Context) {}
}

private struct ShareTokenWrapper: Identifiable {
    let token: String
    var id: String { token }
}

private struct OpenByLinkSheet: View {
    @Binding var tokenInput: String
    let onOpen: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                TextField("Токен или ссылка", text: $tokenInput)
                    .autocapitalization(.none)
            }
            .scrollContentBackground(.hidden)
            .background(GrainyBackgroundView())
            .navigationTitle("Открыть по ссылке")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена", action: onCancel)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Открыть", action: onOpen)
                        .disabled(tokenInput.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

}

struct WishlistCardView: View {
    let summary: WishlistSummary
    var onShare: (() -> Void)? = nil
    var onEdit: (() -> Void)? = nil
    var onDelete: (() -> Void)? = nil

    private var displayEmoji: String {
        if let e = summary.coverEmoji, !e.isEmpty { return e }
        return summary.wishlistType == "event" ? "🎉" : "🎁"
    }

    private var hasCoverImage: Bool {
        summary.coverImageUrl != nil && !(summary.coverImageUrl?.isEmpty ?? true)
    }

    private var formattedDate: String? {
        guard let dateStr = summary.eventDate else { return nil }
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        guard let date = f.date(from: dateStr) else { return dateStr }
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "ru_RU")
        fmt.dateFormat = "d MMMM"
        return fmt.string(from: date)
    }

    private var daysUntilEvent: Int? {
        guard let dateStr = summary.eventDate else { return nil }
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        guard let eventDate = f.date(from: dateStr) else { return nil }
        let cal = Calendar.current
        let days = cal.dateComponents([.day], from: cal.startOfDay(for: Date()), to: cal.startOfDay(for: eventDate)).day
        return days
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            GeometryReader { geo in
                let side = geo.size.width
                ZStack {
                    if hasCoverImage, let urlStr = summary.coverImageUrl, let url = ImageURLHelper.fullURL(for: urlStr) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let img):
                                img.resizable().scaledToFill()
                            default:
                                Color(.systemGray6)
                            }
                        }
                        .frame(width: side, height: side)
                        .clipped()
                    } else {
                        Color(.systemGray6)
                        Text(displayEmoji)
                            .font(.system(size: 44))
                    }
                }
                .frame(width: side, height: side)
            }
            .aspectRatio(1, contentMode: .fit)
            .clipped()
            .background(Color(.systemGray6))

            VStack(alignment: .leading, spacing: 2) {
                Text(summary.title)
                    .font(.footnote)
                    .fontWeight(.medium)
                    .lineLimit(2)
                    .foregroundStyle(.primary)
                Text("\(summary.itemsCount) \(summary.itemsCount == 1 ? "подарок" : summary.itemsCount < 5 ? "подарка" : "подарков")")
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
                if let date = formattedDate {
                    HStack(spacing: 4) {
                        Text(date)
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                        if let days = daysUntilEvent, days > 0 {
                            Text("через \(days) \(days == 1 ? "день" : days < 5 ? "дня" : "дн.")")
                                .font(.system(size: 10))
                                .foregroundStyle(.blue)
                        }
                    }
                } else {
                    Text(" ")
                        .font(.system(size: 10))
                        .foregroundStyle(.clear)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
            .padding(10)
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(.separator), lineWidth: 1)
        )
        .overlay(alignment: .topTrailing) {
            if onShare != nil || onEdit != nil || onDelete != nil {
                Menu {
                    if let onShare = onShare {
                        Button { onShare() } label: { Label("Поделиться", systemImage: "square.and.arrow.up") }
                    }
                    if let onEdit = onEdit {
                        Button { onEdit() } label: { Label("Редактировать", systemImage: "pencil") }
                    }
                    if let onDelete = onDelete {
                        Button(role: .destructive) { onDelete() } label: { Label("Удалить", systemImage: "trash") }
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.caption)
                        .padding(8)
                        .contentShape(Rectangle())
                }
                .padding(4)
            }
        }
    }
}

struct WishlistRowView: View {
    let summary: WishlistSummary
    var body: some View { WishlistCardView(summary: summary) }
}

extension WishlistSummary: Hashable, Identifiable {
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: WishlistSummary, rhs: WishlistSummary) -> Bool { lhs.id == rhs.id }
}
