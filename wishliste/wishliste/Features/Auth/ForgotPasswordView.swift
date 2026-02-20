import SwiftUI

struct ForgotPasswordView: View {
    @State private var email = ""
    @State private var message: String?
    @State private var isLoading = false

    private let client = APIClient.shared

    var body: some View {
        VStack(spacing: 24) {
            Text("Восстановление пароля")
                .font(.title2.bold())
            Text("Введите email — отправим ссылку для сброса пароля.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)

            if let msg = message {
                Text(msg)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            Button(action: submit) {
                if isLoading {
                    ProgressView().tint(.white).frame(maxWidth: .infinity).padding()
                } else {
                    Text("Отправить").frame(maxWidth: .infinity).padding()
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading || email.isEmpty)
            .padding(.horizontal)
        }
        .padding(.top, 32)
        .navigationTitle("Забыли пароль")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func submit() {
        message = nil
        isLoading = true
        Task {
            do {
                let body = ForgotPasswordRequest(email: email)
                let _: EmptyResponse = try await client.request(
                    "/auth/forgot-password",
                    method: "POST",
                    body: body
                )
                message = "Если аккаунт найден, на почту придёт ссылка."
            } catch APIError.server(_, let m) {
                message = m ?? "Сервис в разработке."
            } catch {
                message = "Сервис восстановления пароля пока в разработке."
            }
            isLoading = false
        }
    }
}
