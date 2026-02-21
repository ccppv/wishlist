import SwiftUI
import PhotosUI

struct AddItemView: View {
    let wishlistId: Int
    var onAdded: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var url = ""
    @State private var priceStr = ""
    @State private var imageUrls: [String] = []
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var isParsing = false
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var isUploadingPhotos = false

    private let api = ItemsAPI()

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Spacer()
                        addItemPhotoArea
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))
                }
                Section("Название") {
                    TextField("Название подарка", text: $title)
                        .font(.footnote)
                }
                Section("Описание") {
                    TextField("Описание", text: $description, axis: .vertical)
                        .font(.footnote)
                        .lineLimit(2...4)
                }
                Section("Цена") {
                    TextField("Цена", text: $priceStr)
                        .font(.footnote)
                        .keyboardType(.decimalPad)
                }
                Section("Ссылка") {
                    TextField("URL товара", text: $url)
                        .font(.footnote)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                    Button {
                        parseUrl()
                    } label: {
                        HStack {
                            if isParsing {
                                ProgressView()
                                    .scaleEffect(0.8)
                            }
                            Text(isParsing ? "Парсинг..." : "Спарсить")
                        }
                    }
                    .font(.footnote)
                    .disabled(url.trimmingCharacters(in: .whitespaces).isEmpty || isParsing)
                }
                if let err = errorMessage {
                    Section { Text(err).foregroundStyle(.red).font(.footnote) }
                }
            }
            .navigationTitle("Новый подарок")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Добавить") { add() }
                        .disabled(isLoading || title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }


    private var addItemPhotoArea: some View {
        Group {
            if imageUrls.isEmpty {
                PhotosPicker(selection: $selectedItems, maxSelectionCount: 5, matching: .images) {
                    VStack(spacing: 8) {
                        Image(systemName: "photo.badge.plus")
                            .font(.system(size: 36))
                        Text("Добавить фото (до 5)")
                            .font(.footnote)
                    }
                    .frame(width: 140, height: 140)
                    .background(Color(.systemGray5))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .onChange(of: selectedItems) { _, new in
                    uploadSelectedPhotos(new)
                }
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(Array(imageUrls.enumerated()), id: \.offset) { i, u in
                            ZStack(alignment: .topTrailing) {
                                if let url = ImageURLHelper.fullURL(for: u) {
                                    AsyncImage(url: url) { p in
                                        switch p {
                                        case .success(let img): img.resizable().scaledToFill()
                                        default: Color(.systemGray5)
                                        }
                                    }
                                    .frame(width: 120, height: 120)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                                Button {
                                    imageUrls.remove(at: i)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.title2)
                                        .foregroundStyle(.red)
                                        .background(Circle().fill(Color.white.opacity(0.9)))
                                }
                                .offset(x: 6, y: -6)
                            }
                        }
                        if imageUrls.count < 5 {
                            PhotosPicker(selection: $selectedItems, maxSelectionCount: 5 - imageUrls.count, matching: .images) {
                                Image(systemName: "plus.circle.dashed")
                                    .font(.system(size: 36))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 120, height: 120)
                                    .background(Color(.systemGray5))
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .onChange(of: selectedItems) { _, new in
                                uploadSelectedPhotos(new)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 20)
                }
                .frame(height: 160)
            }
        }
    }

    private func parseUrl() {
        let u = url.trimmingCharacters(in: .whitespaces)
        guard !u.isEmpty else { return }
        let urlResult = URLValidation.validateURL(u)
        guard urlResult.isValid, let validUrl = urlResult.normalized else {
            errorMessage = urlResult.error ?? "Некорректная ссылка"
            return
        }
        errorMessage = nil
        isParsing = true
        Task {
            do {
                let data = try await api.parseUrl(validUrl)
                await MainActor.run {
                    if let t = data.title, !t.isEmpty { title = t }
                    if let d = data.description { description = d }
                    if let p = data.price { priceStr = "\(p)" }
                    if let imgs = data.images, !imgs.isEmpty {
                        imageUrls = Array(imgs.prefix(5))
                    }
                }
            } catch {
                await MainActor.run {
                    errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
                }
            }
            await MainActor.run { isParsing = false }
        }
    }

    private func uploadSelectedPhotos(_ items: [PhotosPickerItem]) {
        guard !items.isEmpty else { return }
        isUploadingPhotos = true
        Task {
            var uploaded: [String] = []
            for item in items {
                if let data = try? await item.loadTransferable(type: Data.self), imageUrls.count + uploaded.count < 5 {
                    let filename = "photo_\(UUID().uuidString.prefix(8)).jpg"
                    do {
                        let u = try await api.uploadImage(data: data, filename: filename)
                        await MainActor.run { uploaded.append(u) }
                    } catch {
                        #if DEBUG
                        print("[AddItemView] uploadImage error: \(error)")
                        #endif
                    }
                }
            }
            await MainActor.run {
                imageUrls.append(contentsOf: uploaded)
                selectedItems = []
                isUploadingPhotos = false
            }
        }
    }

    private func add() {
        errorMessage = nil
        let urlToUse: String?
        if !url.trimmingCharacters(in: .whitespaces).isEmpty {
            let urlResult = URLValidation.validateURL(url)
            guard urlResult.isValid, let valid = urlResult.normalized else {
                errorMessage = urlResult.error ?? "Некорректная ссылка"
                return
            }
            urlToUse = valid
        } else {
            urlToUse = nil
        }
        isLoading = true
        let price: Decimal? = Decimal(string: priceStr.trimmingCharacters(in: .whitespaces))
        let item = ItemCreate(
            wishlistId: wishlistId,
            title: title.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            url: urlToUse,
            images: imageUrls.isEmpty ? nil : imageUrls,
            price: price,
            currency: "₽",
            targetAmount: price,
            priority: "medium"
        )
        Task {
            do {
                _ = try await api.create(wishlistId: wishlistId, item: item)
                onAdded()
                dismiss()
            } catch APIError.unauthorized {
                errorMessage = "Сессия истекла"
                AuthStore.shared.logout()
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            isLoading = false
        }
    }
}
