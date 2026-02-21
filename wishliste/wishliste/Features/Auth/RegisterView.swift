import SwiftUI

struct RegisterView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var username = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var didSend = false
    @State private var showVerify = false

    private let authService = AuthService.shared

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    if didSend {
                        VStack(spacing: 24) {
                            Text("Код подтверждения отправлен на \(email)")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.top, 48)

                            Button(action: { showVerify = true }) {
                                Text("Ввести код")
                                    .font(.headline)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 52)
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding(.horizontal, 24)
                    } else {
                    VStack(spacing: 16) {
                        Text("Регистрация")
                            .font(.system(size: 32, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .padding(.top, 48)

                        Spacer().frame(height: 56)

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Почта")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("example@mail.ru", text: $email)
                                .font(.caption)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .textInputAutocapitalization(.never)
                                .padding(.horizontal, 14)
                                .frame(height: 36)
                                .background(Color(.tertiarySystemFill))
                                .clipShape(Capsule())
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Логин (мин. 3 символа)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("Логин", text: $username)
                                .font(.caption)
                                .textContentType(.username)
                                .autocapitalization(.none)
                                .textInputAutocapitalization(.never)
                                .padding(.horizontal, 14)
                                .frame(height: 36)
                                .background(Color(.tertiarySystemFill))
                                .clipShape(Capsule())
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("Пароль (8+ символов, буквы, цифра, спецсимвол)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            ZStack(alignment: .trailing) {
                                Group {
                                    if showPassword {
                                        TextField("Пароль", text: $password)
                                            .textContentType(.newPassword)
                                    } else {
                                        SecureField("Пароль", text: $password)
                                            .textContentType(.newPassword)
                                    }
                                }
                                .font(.caption)
                                .padding(.horizontal, 14)
                                .padding(.trailing, 36)
                                .frame(height: 36)
                                .background(Color(.tertiarySystemFill))
                                .clipShape(Capsule())

                                Button(action: { showPassword.toggle() }) {
                                    Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                        .font(.system(size: 14))
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.trailing, 12)
                            }
                        }

                        if let err = errorMessage {
                            Text(err)
                                .font(.subheadline)
                                .foregroundStyle(.red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        Button(action: register) {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                                    .frame(width: 160, height: 26)
                            } else {
                                Text("Зарегистрироваться")
                                    .font(.subheadline.weight(.semibold))
                                    .frame(width: 160, height: 26)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .buttonBorderShape(.capsule)
                        .disabled(isLoading || email.isEmpty || username.count < 3 || password.count < 8)

                        Spacer().frame(height: 24)

                        VStack(spacing: 12) {
                            Text("Регистрация")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)

                            HStack(spacing: 32) {
                                SocialAuthButton(icon: "apple.logo", label: "Apple", color: Color.primary) {}
                                GoogleSocialButton {}
                            }
                        }

                        Spacer().frame(height: 24)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
                    }
                }
                .scrollContentBackground(.hidden)

                VStack(spacing: 8) {
                    LegalTextBlock()
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
            }
            .background(GrainyBackgroundView())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Закрыть") { dismiss() }
                }
            }
            .sheet(isPresented: $showVerify) {
                VerifyEmailView(email: email, onSuccess: { })
            }
        }
    }

    private func register() {
        errorMessage = nil
        let pwdResult = PasswordValidator.validate(password)
        if !pwdResult.isValid {
            errorMessage = pwdResult.errors.joined(separator: ". ")
            return
        }
        isLoading = true
        Task { @MainActor in
            do {
                _ = try await authService.register(email: email, username: username, password: password, fullName: nil)
                didSend = true
            } catch APIError.server(let code, let msg) {
                if code == 500 {
                    errorMessage = msg ?? "Ошибка сервера. Проверьте подключение."
                } else {
                    errorMessage = msg ?? "Ошибка регистрации"
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
}
}
