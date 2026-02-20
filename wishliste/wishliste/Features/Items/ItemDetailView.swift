import SwiftUI

struct ItemDetailView: View {
    let itemId: Int
    let wishlistId: Int
    let isOwner: Bool

    @State private var item: Item?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showReserve = false

    private let api = ItemsAPI()
    private let authStore = AuthStore.shared

    var body: some View {
        Group {
            if isLoading && item == nil {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let i = item {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if let url = ImageURLHelper.fullURL(for: i.primaryImageUrl) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let img): img.resizable().scaledToFit()
                                default: Color.gray.opacity(0.2).frame(height: 200)
                                }
                            }
                            .frame(maxHeight: 280)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        Text(i.title).font(.title2.bold())
                        if let d = i.description, !d.isEmpty {
                            Text(d).font(.body).foregroundStyle(.secondary)
                        }
                        if let p = i.price {
                            Text("\(String(describing: p)) \(i.currency)").font(.headline)
                        }
                        if i.isReserved, let name = i.reservedByName {
                            Label("Забронировано: \(name)", systemImage: "checkmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                        if !isOwner && !i.isReserved && authStore.isAuthenticated {
                            Button(action: { showReserve = true }) {
                                Text("Забронировать").frame(maxWidth: .infinity).padding()
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    }
                    .padding()
                }
            } else if let err = errorMessage {
                Text(err).foregroundStyle(.secondary).padding()
            }
        }
        .navigationTitle(item?.title ?? "Подарок")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { load() }
        .sheet(isPresented: $showReserve) {
            if let i = item {
                ReserveItemView(item: i, onReserved: {
                    showReserve = false
                    load()
                })
            }
        }
    }

    private func load() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                item = try await api.get(id: itemId)
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            isLoading = false
        }
    }
}
