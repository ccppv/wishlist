import SwiftUI

struct VerifyEmailView: View {
    let email: String
    var onSuccess: () -> Void

    @State private var code = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var resending = false

    private let authService = AuthService.shared

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text("Введите 6-значный код из письма")
                    .font(.headline)
                    .multilineTextAlignment(.center)
                    .padding(.top)

                TextField("Код", text: $code)
                    .keyboardType(.numberPad)
                    .multilineTextAlignment(.center)
                    .font(.title2)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)

                if let err = errorMessage {
                    Text(err).font(.caption).foregroundStyle(.red)
                }

                Button(action: verify) {
                    if isLoading {
                        ProgressView().tint(.white).frame(maxWidth: .infinity).padding()
                    } else {
                        Text("Подтвердить").frame(maxWidth: .infinity).padding()
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading || code.count != 6)
                .padding(.horizontal)

                Button("Отправить код повторно") {
                    resend()
                }
                .disabled(resending)
                .font(.subheadline)
            }
            .navigationTitle("Подтверждение email")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func verify() {
        guard !isLoading else { return }
        errorMessage = nil
        isLoading = true
        Task { @MainActor in
            defer { isLoading = false }
            do {
                _ = try await authService.verifyEmail(email: email, code: code)
                onSuccess()
            } catch APIError.server(_, let msg) {
                errorMessage = msg ?? "Неверный или просроченный код"
            } catch APIError.decoding(let err) {
                if let decodingErr = err as? DecodingError {
                    switch decodingErr {
                    case .keyNotFound(let key, _):
                        errorMessage = "Ошибка данных: отсутствует поле \(key.stringValue)"
                    case .typeMismatch(_, let ctx):
                        errorMessage = "Ошибка данных: неверный тип в \(ctx.codingPath.map(\.stringValue).joined(separator: "."))"
                    case .valueNotFound(_, let ctx):
                        errorMessage = "Ошибка данных: пустое значение в \(ctx.codingPath.map(\.stringValue).joined(separator: "."))"
                    default:
                        errorMessage = "Ошибка данных: \(decodingErr.localizedDescription)"
                    }
                } else {
                    errorMessage = "Ошибка данных: \(err.localizedDescription)"
                }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func resend() {
        resending = true
        Task { @MainActor in
            defer { resending = false }
            _ = try? await authService.resendCode(email: email)
        }
    }
}
