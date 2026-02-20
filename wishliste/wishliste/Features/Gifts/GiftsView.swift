import SwiftUI

struct GiftsView: View {
    @State private var list: [ReservedItemDetail] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private let api = ItemsAPI()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Group {
                    if isLoading && list.isEmpty {
                        ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if let err = errorMessage {
                        VStack(spacing: 12) {
                            Text(err).foregroundStyle(.secondary).multilineTextAlignment(.center)
                            Button("Повторить") { load() }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if list.isEmpty {
                        ContentUnavailableView(
                            "Нет забронированных подарков",
                            systemImage: "gift",
                            description: Text("Здесь появятся подарки, которые вы забронировали")
                        )
                    } else {
                        ScrollView {
                            LazyVGrid(columns: [GridItem(.flexible(minimum: 168)), GridItem(.flexible(minimum: 168))], spacing: 6) {
                                ForEach(list, id: \.id) { item in
                                    ReservedItemCardView(item: item, onCancel: { load() })
                                }
                            }
                            .padding(6)
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .background(GrainyBackgroundView())
            .navigationTitle("Подарки друзьям")
            .navigationBarTitleDisplayMode(.large)
            .refreshable { load() }
            .onAppear { load() }
            .onReceive(NotificationCenter.default.publisher(for: .itemReservationChanged)) { _ in
                load()
            }
        }
    }

    private func load() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                if AuthStore.shared.isGuestMode {
                    list = try await api.myReservationsGuest()
                } else {
                    list = try await api.myReservations()
                }
            } catch APIError.unauthorized {
                if AuthStore.shared.isGuestMode {
                    GuestSessionStore.shared.clear()
                } else {
                    AuthStore.shared.logout()
                }
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            isLoading = false
        }
    }
}

struct ReservedItemCardView: View {
    let item: ReservedItemDetail
    var onCancel: () -> Void

    @State private var currentImageIndex = 0
    @State private var showCancel = false
    private let api = ItemsAPI()

    private var imageUrls: [String] {
        let imgs = item.images ?? []
        if !imgs.isEmpty { return imgs }
        if let u = item.imageUrl, !u.isEmpty { return [u] }
        return []
    }

    private var ownerName: String {
        guard let w = item.wishlist else { return "" }
        return (w.ownerFullname?.isEmpty == false ? w.ownerFullname : nil) ?? w.ownerUsername
    }

    private var hasUrl: Bool {
        guard let u = item.url, !u.isEmpty else { return false }
        return URL(string: u) != nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
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
                if !ownerName.isEmpty {
                    Text(ownerName)
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
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
                        Text("\(Int(progress * 100))% · \(String(describing: item.collectedAmount)) / \(String(describing: price)) \(item.currency)")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                } else if let p = item.price {
                    Text("\(String(describing: p)) \(item.currency)")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
                Button("Отменить резервацию") {
                    showCancel = true
                }
                .font(.system(size: 10))
                .foregroundStyle(.red)
            }
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
            .padding(10)
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.separator), lineWidth: 1))
        .confirmationDialog("Отменить резервацию?", isPresented: $showCancel) {
            Button("Отменить резервацию", role: .destructive) { cancelReservation() }
            Button("Нет", role: .cancel) {}
        } message: {
            Text("Вы перестанете быть забронировавшим этот подарок.")
        }
    }

    private func cancelReservation() {
        Task {
            _ = try? await api.unreserve(itemId: item.id)
            onCancel()
        }
    }
}
