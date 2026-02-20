import SwiftUI

struct WishlistDetailView: View {
    let wishlistId: Int
    let title: String

    @State private var wishlist: Wishlist?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showAddItem = false
    @State private var itemToEdit: Item?
    @State private var itemToDelete: Item?
    @State private var isSelectMode = false
    @State private var selectedItemIds: Set<Int> = []
    @State private var shareUrl: ShareableURL?
    @State private var itemToReserve: Item?

    private let api = WishlistsAPI()
    private let itemsAPI = ItemsAPI()
    private let authStore = AuthStore.shared
    private var isOwner: Bool {
        guard let w = wishlist, let me = authStore.user else { return false }
        return w.ownerId == me.id
    }

    var body: some View {
        Group {
            if isLoading && wishlist == nil {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = errorMessage {
                VStack {
                    Text(err).foregroundStyle(.secondary)
                    Button("Повторить") { load() }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let w = wishlist {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.flexible(minimum: 168)), GridItem(.flexible(minimum: 168))], spacing: 6) {
                        if let items = w.items {
                            ForEach(items, id: \.id) { item in
                                ItemCardView(
                                    item: item,
                                    isOwner: isOwner,
                                    isSelectMode: isSelectMode,
                                    isSelected: selectedItemIds.contains(item.id),
                                    onToggleSelect: { toggleSelect(item.id) },
                                    onEdit: { itemToEdit = item },
                                    onDelete: { itemToDelete = item },
                                    onOpenUrl: { openUrl(item.url) },
                                    onReserve: isOwner ? nil : { itemToReserve = item }
                                )
                            }
                        }
                    }
                    .padding(6)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(GrainyBackgroundView())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                if isOwner {
                    Button(isSelectMode ? "Готово" : "Выбрать") {
                        isSelectMode.toggle()
                        if !isSelectMode { selectedItemIds.removeAll() }
                    }
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: shareWishlist) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                if isOwner, isSelectMode && !selectedItemIds.isEmpty {
                    Button(role: .destructive, action: deleteSelected) {
                        Image(systemName: "trash")
                    }
                }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            if isOwner, !isSelectMode {
                Button(action: { showAddItem = true }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(.gray.opacity(0.8))
                }
                .padding(.trailing, 24)
                .padding(.bottom, 50)
            }
        }
        .onAppear { load() }
        .refreshable { load() }
        .onReceive(NotificationCenter.default.publisher(for: .itemReservationChanged)) { notification in
            guard let wid = notification.userInfo?["wishlist_id"] as? Int, wid == wishlistId else { return }
            load()
        }
        .sheet(isPresented: $showAddItem) {
            if let w = wishlist {
                AddItemView(wishlistId: w.id, onAdded: {
                    showAddItem = false
                    load()
                })
            }
        }
        .sheet(item: $itemToEdit) { item in
            EditItemView(item: item, onSaved: {
                itemToEdit = nil
                load()
            })
        }
        .sheet(item: $shareUrl) { item in
            ShareSheet(activityItems: [item.url])
        }
        .alert(item: $itemToDelete) { item in
            Alert(
                title: Text("Удалить подарок?"),
                message: Text("\(item.title) будет удалён."),
                primaryButton: .destructive(Text("Удалить")) { performDelete(item) },
                secondaryButton: .cancel { itemToDelete = nil }
            )
        }
        .sheet(item: $itemToReserve) { item in
            ReserveSheet(item: item, isAuthenticated: true, onReserved: {
                itemToReserve = nil
                load()
            }, onDismiss: { itemToReserve = nil })
        }
    }


    private func toggleSelect(_ id: Int) {
        if selectedItemIds.contains(id) { selectedItemIds.remove(id) }
        else { selectedItemIds.insert(id) }
    }

    private func deleteSelected() {
        guard !selectedItemIds.isEmpty else { return }
        Task {
            for id in selectedItemIds {
                try? await itemsAPI.delete(id: id)
            }
            await MainActor.run {
                selectedItemIds.removeAll()
                isSelectMode = false
                load()
            }
        }
    }

    private func shareWishlist() {
        guard let w = wishlist else { return }
        let base = NetworkConfig.baseURLString.replacingOccurrences(of: "/api/v1", with: "")
        if let url = URL(string: "\(base)/wl/\(w.shareToken)") {
            shareUrl = ShareableURL(id: url.absoluteString, url: url)
        }
    }

    private func openUrl(_ urlStr: String?) {
        guard let s = urlStr, !s.isEmpty, let url = URL(string: s) else { return }
        UIApplication.shared.open(url)
    }

    private func performDelete(_ item: Item) {
        Task {
            try? await itemsAPI.delete(id: item.id)
            await MainActor.run {
                itemToDelete = nil
                load()
            }
        }
    }

    private func load() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                wishlist = try await api.get(id: wishlistId)
            } catch APIError.unauthorized {
                AuthStore.shared.logout()
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            isLoading = false
        }
    }
}

struct ItemCardView: View {
    let item: Item
    let isOwner: Bool
    var isSelectMode = false
    var isSelected = false
    var onToggleSelect: (() -> Void)? = nil
    var onEdit: (() -> Void)? = nil
    var onDelete: (() -> Void)? = nil
    var onOpenUrl: (() -> Void)? = nil
    var onReserve: (() -> Void)? = nil

    @State private var currentImageIndex = 0

    private var imageUrls: [String] {
        let imgs = item.images ?? []
        if !imgs.isEmpty { return imgs }
        if let u = item.imageUrl, !u.isEmpty { return [u] }
        return []
    }

    private var hasUrl: Bool {
        guard let u = item.url, !u.isEmpty else { return false }
        return URL(string: u) != nil
    }

    var body: some View {
        let cardContent = VStack(alignment: .leading, spacing: 0) {
            GeometryReader { geo in
                let side = geo.size.width
                ZStack(alignment: .bottom) {
                    if imageUrls.isEmpty {
                        Color(.systemGray5)
                        Image(systemName: "gift")
                            .font(.system(size: 36))
                            .foregroundStyle(.secondary)
                    } else if imageUrls.count == 1, let url = ImageURLHelper.fullURL(for: imageUrls[0]) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let img): img.resizable().scaledToFill()
                            default: Color(.systemGray5)
                            }
                        }
                        .frame(width: side, height: side)
                        .clipped()
                    } else {
                        TabView(selection: $currentImageIndex) {
                            ForEach(Array(imageUrls.enumerated()), id: \.offset) { i, path in
                                if let url = ImageURLHelper.fullURL(for: path) {
                                    AsyncImage(url: url) { phase in
                                        switch phase {
                                        case .success(let img): img.resizable().scaledToFill()
                                        default: Color(.systemGray5)
                                        }
                                    }
                                    .frame(width: side, height: side)
                                    .clipped()
                                    .tag(i)
                                }
                            }
                        }
                        .tabViewStyle(.page(indexDisplayMode: .never))
                        .frame(width: side, height: side)

                        HStack(spacing: 4) {
                            ForEach(0..<imageUrls.count, id: \.self) { i in
                                Circle()
                                    .fill(i == currentImageIndex ? Color.primary : Color.primary.opacity(0.3))
                                    .frame(width: 5, height: 5)
                            }
                        }
                        .padding(.bottom, 6)
                    }
                }
                .frame(width: side, height: side)
            }
            .aspectRatio(1, contentMode: .fit)
            .clipped()

            VStack(alignment: .leading, spacing: 2) {
                Text(item.title)
                    .font(.footnote)
                    .fontWeight(.medium)
                    .lineLimit(2)
                    .foregroundStyle(hasUrl ? .blue : .primary)
                if item.collectedAmount > 0, let price = item.price, price > 0 {
                    let collected = (item.collectedAmount as NSDecimalNumber).doubleValue
                    let target = (price as NSDecimalNumber).doubleValue
                    let progress = min(collected / target, 1)
                    VStack(alignment: .leading, spacing: 2) {
                        ProgressView(value: progress)
                            .tint(.blue)
                        Text("\(Int(progress * 100))% · \(String(describing: item.collectedAmount)) / \(String(describing: price)) \(item.currency ?? "")")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                } else if let p = item.price {
                    Text("\(String(describing: p)) \(item.currency)")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
                if item.isReserved, let name = item.reservedByName {
                    Text("Забронировано: \(name)")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
                if !isOwner, !item.isReserved, onReserve != nil {
                    Button("Забронировать") { onReserve?() }
                        .font(.system(size: 10))
                        .buttonStyle(.bordered)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
            .padding(10)
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.separator), lineWidth: 1))
        .overlay {
            if item.isReserved {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(.black.opacity(0.4))
                    Text("Забронировано")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(.white)
                }
            }
        }

        Group {
            if isSelectMode, let onToggle = onToggleSelect {
                Button(action: onToggle) {
                    cardContent
                        .overlay(alignment: .topLeading) {
                            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                                .font(.title3)
                                .foregroundStyle(isSelected ? .blue : .secondary)
                                .padding(6)
                        }
                }
                .buttonStyle(.plain)
            } else if hasUrl, let onOpen = onOpenUrl {
                Button(action: onOpen) {
                    cardContent
                }
                .buttonStyle(.plain)
            } else {
                cardContent
            }
        }
        .overlay(alignment: .topTrailing) {
            if !isSelectMode, isOwner, onEdit != nil || onDelete != nil {
                Menu {
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

struct ItemRowView: View {
    let item: Item
    let isOwner: Bool

    var body: some View {
        HStack(spacing: 12) {
            if let url = ImageURLHelper.fullURL(for: item.primaryImageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img): img.resizable().scaledToFill()
                    default: Color.gray.opacity(0.2)
                    }
                }
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title).font(.headline)
                if let p = item.price {
                    Text("\(String(describing: p)) \(item.currency)").font(.caption).foregroundStyle(.secondary)
                }
                if item.isReserved, let name = item.reservedByName {
                    Text("Забронировано: \(name)").font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
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
extension Item: Hashable {
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
    static func == (lhs: Item, rhs: Item) -> Bool { lhs.id == rhs.id }
}
