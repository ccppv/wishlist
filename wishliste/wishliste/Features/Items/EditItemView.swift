import SwiftUI
import PhotosUI

struct EditItemView: View {
    let item: Item
    var onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var description: String
    @State private var url: String
    @State private var priceStr: String
    @State private var imageUrls: [String]
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var isParsing = false
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var showPhotoPicker = false

    private let api = ItemsAPI()

    init(item: Item, onSaved: @escaping () -> Void) {
        self.item = item
        self.onSaved = onSaved
        _title = State(initialValue: item.title)
        _description = State(initialValue: item.description ?? "")
        _url = State(initialValue: item.url ?? "")
        _priceStr = State(initialValue: item.price.map { "\($0)" } ?? "")
        _imageUrls = State(initialValue: item.images ?? [])
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Spacer()
                        photoGrid
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
                    Button("Спарсить") { parseUrl() }
                        .font(.footnote)
                        .disabled(url.trimmingCharacters(in: .whitespaces).isEmpty || isParsing)
                }
                if let err = errorMessage {
                    Section { Text(err).foregroundStyle(.red).font(.footnote) }
                }
            }
            .navigationTitle("Редактировать подарок")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }.font(.footnote)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") { save() }
                        .font(.footnote)
                        .disabled(isLoading || title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .sheet(isPresented: $showPhotoPicker) {
                PhotoPickerForItemsSheet(selectedItems: $selectedItems, maxCount: 5 - imageUrls.count, onDismiss: { showPhotoPicker = false })
            }
            .onChange(of: selectedItems) { _, new in
                uploadSelectedPhotos(new)
            }
        }
    }

    private var photoGrid: some View {
        let urls = imageUrls
        return Group {
            if urls.isEmpty {
                Button { showPhotoPicker = true } label: {
                    Image(systemName: "plus.circle.dashed")
                        .font(.system(size: 36))
                        .foregroundStyle(.secondary)
                        .frame(width: 140, height: 140)
                        .background(Color(.systemGray5))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(Array(urls.enumerated()), id: \.offset) { i, u in
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
                        if urls.count < 5 {
                            Button { showPhotoPicker = true } label: {
                                Image(systemName: "plus.circle.dashed")
                                    .font(.system(size: 36))
                                    .foregroundStyle(.secondary)
                                    .frame(width: 120, height: 120)
                                    .background(Color(.systemGray5))
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .buttonStyle(.plain)
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
        Task {
            for pickerItem in items {
                if let data = try? await pickerItem.loadTransferable(type: Data.self), imageUrls.count < 5 {
                    let filename = "photo_\(UUID().uuidString.prefix(8)).jpg"
                    do {
                        let u = try await api.uploadImage(data: data, filename: filename)
                        await MainActor.run { imageUrls.append(u) }
                    } catch {
                        #if DEBUG
                        print("[EditItemView] uploadImage error: \(error)")
                        #endif
                    }
                }
            }
            await MainActor.run { selectedItems = []; showPhotoPicker = false }
        }
    }

    private func save() {
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
        var update = ItemUpdate()
        update.title = title.trimmingCharacters(in: .whitespaces)
        update.description = description.isEmpty ? nil : description
        update.url = urlToUse
        update.images = imageUrls.isEmpty ? nil : imageUrls
        update.price = price
        update.currency = "₽"
        update.targetAmount = price
        Task {
            do {
                _ = try await api.update(id: item.id, update: update)
                onSaved()
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

private struct PhotoPickerForItemsSheet: View {
    @Binding var selectedItems: [PhotosPickerItem]
    let maxCount: Int
    var onDismiss: () -> Void

    var body: some View {
        NavigationStack {
            PhotosPicker(selection: $selectedItems, maxSelectionCount: maxCount, matching: .images) {
                Label("Выберите фото", systemImage: "photo.on.rectangle.angled")
                    .font(.footnote)
            }
            .padding()
            .navigationTitle("Фото")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена", action: onDismiss).font(.footnote)
                }
            }
        }
    }
}
