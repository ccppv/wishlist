import SwiftUI

struct OnboardingView: View {
    var onDone: () -> Void = {}
    @EnvironmentObject private var store: AuthStore
    @State private var fullName = ""
    @State private var selectedImage: UIImage?
    @State private var showPicker = false
    @State private var errorMessage: String?
    @State private var isLoading = false

    private let authService = AuthService.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Расскажите о себе")
                    .font(.title.bold())
                    .padding(.top, 40)

                Button(action: { showPicker = true }) {
                    if let img = selectedImage {
                        Image(uiImage: img)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 120, height: 120)
                            .clipShape(Circle())
                    } else {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 80))
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.bottom, 8)

                TextField("Ваше имя", text: $fullName)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)

                if let err = errorMessage {
                    Text(err).font(.caption).foregroundStyle(.red)
                }

                Button(action: submit) {
                    if isLoading {
                        ProgressView().tint(.white).frame(maxWidth: .infinity).padding()
                    } else {
                        Text("Продолжить").frame(maxWidth: .infinity).padding()
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading || fullName.trimmingCharacters(in: .whitespaces).isEmpty)
                .padding(.horizontal)
            }
        }
        .sheet(isPresented: $showPicker) {
            ImagePicker(image: $selectedImage)
        }
    }

    private func submit() {
        guard !isLoading else { return }
        errorMessage = nil
        isLoading = true
        let name = fullName.trimmingCharacters(in: .whitespaces)
        let imageData = selectedImage.flatMap { $0.jpegData(compressionQuality: 0.8) }
        let filename = selectedImage != nil ? "avatar.jpg" : nil
        Task { @MainActor in
            defer { isLoading = false }
            do {
                let user = try await authService.onboarding(fullName: name, avatarData: imageData, avatarFilename: filename)
                store.setUser(user)
                onDone()
            } catch APIError.unauthorized {
                store.logout()
            } catch APIError.server(_, let msg) {
                errorMessage = msg ?? "Ошибка"
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
