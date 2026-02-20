import SwiftUI

struct PublicWishlistView: View {
    let shareToken: String
    var onDismiss: (() -> Void)?

    @State private var wishlist: Wishlist?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showAddItem = false
    @State private var itemToEdit: Item?
    @State private var itemToDelete: Item?
    @State private var isSelectMode = false
    @State private var selectedItemIds: Set<Int> = []
    @State private var itemToReserve: Item?

    private let api = WishlistsAPI()
    private let itemsAPI = ItemsAPI()
    private let authStore = AuthStore.shared
    private var isOwner: Bool {
        guard let w = wishlist, let me = authStore.user else { return false }
        return w.ownerId == me.id
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && wishlist == nil {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = errorMessage {
                    VStack(spacing: 12) {
                        Text(err).foregroundStyle(.secondary).multilineTextAlignment(.center)
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
            .navigationTitle(wishlist?.title ?? "Вишлист")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if let dismiss = onDismiss {
                        Button(action: dismiss) {
                            Image(systemName: "chevron.left")
                        }
                    }
                    if isOwner {
                        Button(isSelectMode ? "Готово" : "Выбрать") {
                            isSelectMode.toggle()
                            if !isSelectMode { selectedItemIds.removeAll() }
                        }
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
                guard let w = wishlist,
                      let wid = notification.userInfo?["wishlist_id"] as? Int,
                      wid == w.id else { return }
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
            .alert(item: $itemToDelete) { item in
                Alert(
                    title: Text("Удалить подарок?"),
                    message: Text("\(item.title) будет удалён."),
                    primaryButton: .destructive(Text("Удалить")) { performDelete(item) },
                    secondaryButton: .cancel { itemToDelete = nil }
                )
            }
            .sheet(item: $itemToReserve) { item in
                ReserveSheet(item: item, isAuthenticated: authStore.user != nil, onReserved: {
                    itemToReserve = nil
                    load()
                }, onDismiss: { itemToReserve = nil })
            }
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
                wishlist = try await api.getByShareToken(shareToken)
            } catch APIError.unauthorized {
                AuthStore.shared.logout()
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            isLoading = false
        }
    }
}
