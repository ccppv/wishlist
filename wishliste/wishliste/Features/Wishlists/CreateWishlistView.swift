import SwiftUI
import PhotosUI

struct CreateWishlistView: View {
    var onCreated: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var description = ""
    @State private var wishlistType = "permanent"
    @State private var eventName = ""
    @State private var eventDate = Date()
    @State private var visibility = "by_link"
    @State private var coverEmoji = ""
    @State private var selectedCoverItem: PhotosPickerItem?
    @State private var coverImageData: Data?
    @State private var showEmojiPicker = false
    @State private var showPhotoPicker = false
    @State private var errorMessage: String?
    @State private var isLoading = false

    private let api = WishlistsAPI()

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Spacer()
                        Menu {
                            Button { showEmojiPicker = true } label: { Label("Поставить эмодзи", systemImage: "face.smiling") }
                            Button { showPhotoPicker = true } label: { Label("Выбрать фото", systemImage: "photo") }
                        } label: {
                            Group {
                                if let data = coverImageData, let uiImage = UIImage(data: data) {
                                    Image(uiImage: uiImage)
                                        .resizable()
                                        .scaledToFill()
                                        .frame(width: 100, height: 100)
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                } else if !coverEmoji.isEmpty {
                                    Text(coverEmoji)
                                        .font(.system(size: 48))
                                        .frame(width: 100, height: 100)
                                        .background(Color(.systemGray5))
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                } else {
                                    Image(systemName: "plus.circle.dashed")
                                        .font(.system(size: 36))
                                        .foregroundStyle(.secondary)
                                        .frame(width: 100, height: 100)
                                        .background(Color(.systemGray5))
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                }
                Section("Название") {
                    TextField("Название списка", text: $title)
                        .font(.footnote)
                }
                Section("Описание") {
                    TextField("Описание", text: $description, axis: .vertical)
                        .font(.footnote)
                        .lineLimit(3...6)
                }
                Section("Тип") {
                    Picker("Тип", selection: $wishlistType) {
                        Text("Постоянный").tag("permanent")
                        Text("Событие").tag("event")
                    }
                    .pickerStyle(.segmented)
                }
                .font(.footnote)
                if wishlistType == "event" {
                    Section("Событие") {
                        DatePicker("Дата", selection: $eventDate, displayedComponents: .date)
                            .font(.footnote)
                        TextField("Название праздника", text: $eventName)
                            .font(.footnote)
                    }
                }
                Section("Доступ") {
                    Picker("Видимость", selection: $visibility) {
                        Text("По ссылке").tag("by_link")
                        Text("Для друзей").tag("friends_only")
                        Text("Для всех").tag("public")
                    }
                    .font(.footnote)
                }
                if let err = errorMessage {
                    Section {
                        Text(err).font(.footnote).foregroundStyle(.red)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(GrainyBackgroundView())
            .navigationTitle("Новый вишлист")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                        .font(.footnote)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Создать") { create() }
                        .font(.footnote)
                        .disabled(isLoading || title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .sheet(isPresented: $showEmojiPicker) {
                EmojiPickerSheet { emoji in
                    coverEmoji = emoji
                    coverImageData = nil
                    selectedCoverItem = nil
                    showEmojiPicker = false
                }
            }
            .sheet(isPresented: $showPhotoPicker) {
                PhotoPickerSheet(selectedItem: $selectedCoverItem, onDismiss: { showPhotoPicker = false })
            }
            .onChange(of: selectedCoverItem) { _, new in
                guard let new = new else { return }
                Task {
                    if let data = try? await new.loadTransferable(type: Data.self) {
                        await MainActor.run {
                            coverImageData = data
                            coverEmoji = ""
                            showPhotoPicker = false
                        }
                    }
                }
            }
        }
    }

    private func create() {
        errorMessage = nil
        isLoading = true
        let t = title.trimmingCharacters(in: .whitespaces)
        let d = description.trimmingCharacters(in: .whitespaces)
        let en = wishlistType == "event" ? eventName.trimmingCharacters(in: .whitespaces) : nil
        let ed: String? = wishlistType == "event" ? {
            let f = DateFormatter()
            f.dateFormat = "yyyy-MM-dd"
            return f.string(from: eventDate)
        }() : nil
        let em = coverImageData == nil && !coverEmoji.isEmpty ? coverEmoji : nil
        let imgData = coverImageData
        let imgName = imgData != nil ? "cover_\(UUID().uuidString.prefix(8)).jpg" : nil

        Task {
            do {
                _ = try await api.create(
                    title: t,
                    description: d.isEmpty ? nil : d,
                    wishlistType: wishlistType,
                    eventName: en?.isEmpty == false ? en : nil,
                    eventDate: ed,
                    visibility: visibility,
                    coverEmoji: em,
                    coverImageData: imgData,
                    coverImageName: imgName
                )
                onCreated()
                dismiss()
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            isLoading = false
        }
    }
}
