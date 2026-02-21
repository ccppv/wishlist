import SwiftUI
import PhotosUI

struct EditProfileView: View {
    let user: User
    var onSaved: (User) -> Void

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var authStore: AuthStore
    @State private var fullName: String
    @State private var selectedItem: PhotosPickerItem?
    @State private var avatarData: Data?
    @State private var errorMessage: String?
    @State private var isLoading = false

    private let usersAPI = UsersAPI()

    init(user: User, onSaved: @escaping (User) -> Void) {
        self.user = user
        self.onSaved = onSaved
        _fullName = State(initialValue: user.fullName ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Spacer()
                        PhotosPicker(selection: $selectedItem, matching: .images) {
                            if let data = avatarData, let uiImage = UIImage(data: data) {
                                Image(uiImage: uiImage)
                                    .resizable().scaledToFill()
                                    .frame(width: 100, height: 100)
                                    .clipShape(Circle())
                            } else if let url = ImageURLHelper.fullURL(for: user.avatarUrl) {
                                AsyncImage(url: url) { p in
                                    switch p {
                                    case .success(let img): img.resizable().scaledToFill()
                                    default: Color.gray.opacity(0.2)
                                    }
                                }
                                .frame(width: 100, height: 100)
                                .clipShape(Circle())
                            } else {
                                Image(systemName: "person.circle.fill")
                                    .font(.system(size: 100))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .onChange(of: selectedItem) { _, new in
                            Task {
                                if let data = try? await new?.loadTransferable(type: Data.self) {
                                    await MainActor.run { avatarData = data }
                                }
                            }
                        }
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                }
                Section("Имя") {
                    TextField("Имя", text: $fullName)
                }
                if let err = errorMessage {
                    Section { Text(err).foregroundStyle(.red) }
                }
            }
            .scrollContentBackground(.hidden)
            .background(GrainyBackgroundView())
            .navigationTitle("Редактировать профиль")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") { save() }
                        .disabled(isLoading)
                }
            }
        }
    }

    private func save() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                let nameToSend = fullName.trimmingCharacters(in: .whitespaces)
                let jpegData: Data? = if let data = avatarData, let img = UIImage(data: data) {
                    img.jpegData(compressionQuality: 0.85)
                } else { nil }
                let filename = jpegData != nil ? "avatar_\(UUID().uuidString.prefix(8)).jpg" : nil

                #if DEBUG
                print("[EditProfile] save: fullName=\(nameToSend.isEmpty ? "(empty)" : "'\(nameToSend)'") avatarData=\(avatarData != nil ? "\(avatarData!.count) bytes" : "nil") jpegData=\(jpegData != nil ? "\(jpegData!.count) bytes" : "nil") filename=\(filename ?? "nil")")
                #endif
                #if DEBUG
                if jpegData != nil { print("[EditProfile] -> PATCH /users/me (multipart)") }
                #endif
                #if DEBUG
                else if !nameToSend.isEmpty { print("[EditProfile] -> PATCH /users/me/json") }
                #endif
                #if DEBUG
                else { print("[EditProfile] -> no changes, skip") }
                #endif

                let updatedUser = try await usersAPI.updateMe(
                    fullName: nameToSend.isEmpty ? nil : nameToSend,
                    avatarData: jpegData,
                    avatarFilename: filename
                )

                #if DEBUG
                print("[EditProfile] OK: full_name=\(updatedUser.fullName ?? "nil") avatar_url=\(updatedUser.avatarUrl ?? "nil")")
                #endif

                await MainActor.run {
                    authStore.setUser(updatedUser)
                    onSaved(updatedUser)
                    dismiss()
                }
            } catch {
                #if DEBUG
                print("[EditProfile] ERROR: \(error)")
                #endif
                await MainActor.run {
                    errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
                }
            }
            await MainActor.run { isLoading = false }
        }
    }
}
