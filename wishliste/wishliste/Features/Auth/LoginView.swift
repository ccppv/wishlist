import SwiftUI

struct LoginView: View {
    @State private var username = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showRegister = false
    @State private var showAnonymousSheet = false

    private let authService = AuthService.shared

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 28) {
                        Text("WishList")
                            .font(.system(size: 32, weight: .bold))
                        Text("Ваши мечты в одном приложении")
                            .font(.system(size: 17))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.top, -8)

                        Spacer().frame(height: 80)

                        VStack(alignment: .leading, spacing: 12) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Почта")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                TextField("example@mail.ru", text: $username)
                                    .font(.caption)
                                    .textContentType(.username)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .textInputAutocapitalization(.never)
                                    .padding(.horizontal, 14)
                                    .frame(height: 36)
                                    .background(Color(.tertiarySystemFill))
                                    .clipShape(Capsule())
                            }

                            VStack(alignment: .leading, spacing: 6) {
                                Text("Пароль")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            ZStack(alignment: .trailing) {
                                Group {
                                    if showPassword {
                                        TextField("Пароль", text: $password)
                                            .textContentType(.password)
                                    } else {
                                        SecureField("Пароль", text: $password)
                                            .textContentType(.password)
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
                        }

                        HStack {
                            Spacer()
                            NavigationLink(destination: ForgotPasswordView()) {
                                Text("Забыли пароль?")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        if let err = errorMessage {
                            Text(err)
                                .font(.caption)
                                .foregroundStyle(.red)
                        }

                        Button(action: login) {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                                    .frame(width: 180, height: 32)
                            } else {
                                Text("Авторизоваться")
                                    .font(.subheadline.weight(.semibold))
                                    .frame(width: 180, height: 32)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .buttonBorderShape(.capsule)
                        .disabled(isLoading || username.isEmpty || password.isEmpty)

                        Spacer().frame(height: 40)

                        VStack(spacing: 12) {
                            Text("Авторизоваться")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)

                            HStack(spacing: 32) {
                                SocialAuthButton(icon: "apple.logo", label: "Apple", color: Color.primary) {}
                                GoogleSocialButton {}
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 48)
                    .padding(.bottom, 48)
                }
                .scrollContentBackground(.hidden)

                VStack(spacing: 8) {
                    LegalTextBlock()
                        .padding(.top, 24)

                    HStack(spacing: 12) {
                        Button("Зарегистрироваться") { showRegister = true }
                            .font(.footnote)
                            .foregroundStyle(.blue)
                        Text("•")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Button("Войти анонимно") { showAnonymousSheet = true }
                            .font(.footnote)
                            .foregroundStyle(.blue)
                    }

                    NavigationLink(destination: ForgotPasswordView()) {
                        Text("Проблемы со входом")
                            .font(.caption)
                            .foregroundStyle(.blue)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
            }
            .background(GrainyBackgroundView())
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showRegister) {
                RegisterView()
            }
            .sheet(isPresented: $showAnonymousSheet) {
                AnonymousLoginSheet(onSuccess: { showAnonymousSheet = false })
            }
        }
    }

    private func login() {
        errorMessage = nil
        isLoading = true
        Task { @MainActor in
            do {
                _ = try await authService.login(username: username, password: password)
            } catch APIError.unauthorized {
                errorMessage = "Неверный логин или пароль"
            } catch APIError.server(let code, let msg) {
                if code == 403 {
                    errorMessage = msg ?? "Email не подтверждён. Проверьте почту и введите код."
                } else {
                    errorMessage = msg ?? "Ошибка \(code)"
                }
            } catch let err as DecodingError {
                switch err {
                case .keyNotFound(let key, _):
                    errorMessage = "Ошибка данных: отсутствует поле \(key.stringValue)"
                case .typeMismatch(_, let ctx):
                    let pathStr = ctx.codingPath.map { $0.stringValue }.joined(separator: ".")
                    errorMessage = "Ошибка данных: неверный тип в \(pathStr)"
                case .valueNotFound(_, let ctx):
                    let pathStr = ctx.codingPath.map { $0.stringValue }.joined(separator: ".")
                    errorMessage = "Ошибка данных: пустое значение в \(pathStr)"
                default:
                    errorMessage = "Ошибка данных: \(err.localizedDescription)"
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

struct LegalTextBlock: View {
    @State private var showTerms = false
    @State private var showPrivacy = false

    var body: some View {
        VStack(spacing: 4) {
            Text("Продолжая, вы принимаете")
                .font(.caption2)
                .foregroundStyle(.secondary)
            HStack(spacing: 4) {
                Button("Условия использования") { showTerms = true }
                    .font(.caption2)
                    .foregroundStyle(.blue)
                Text("и")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Button("Политику конфиденциальности") { showPrivacy = true }
                    .font(.caption2)
                    .foregroundStyle(.blue)
            }
            Text(" и подтверждаете, что вам исполнилось 18 лет.")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .multilineTextAlignment(.center)
        .padding(.horizontal, 8)
        .sheet(isPresented: $showTerms) {
            LegalDocumentSheet(title: "Условия использования", content: LegalDocuments.loadTerms())
        }
        .sheet(isPresented: $showPrivacy) {
            LegalDocumentSheet(title: "Политика конфиденциальности", content: LegalDocuments.loadPrivacy())
        }
    }
}

struct SocialAuthButton: View {
    let icon: String
    let label: String
    var color: Color = .primary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundStyle(color)
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(width: 64, height: 56)
        }
        .buttonStyle(.plain)
    }
}

struct GoogleSocialButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image("GoogleLogo")
                    .renderingMode(.original)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 28, height: 28)
                Text("Google")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(width: 64, height: 56)
        }
        .buttonStyle(.plain)
    }
}

struct AnonymousLoginSheet: View {
    let onSuccess: () -> Void
    @State private var displayName = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var showNameInput = false
    @Environment(\.dismiss) private var dismiss

    private var savedName: String? { GuestSessionStore.shared.lastGuestName }

    var body: some View {
        NavigationStack {
            if let name = savedName, !showNameInput {
                VStack(spacing: 24) {
                    Text("Восстановить профиль?")
                        .font(.headline)
                        .padding(.top, 32)
                    Text("Найден сохранённый профиль: \(name)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)

                    if let err = errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .padding(.horizontal)
                    }

                    Button(action: { restoreProfile(name: name) }) {
                        if isLoading {
                            ProgressView().tint(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                        } else {
                            Text("Войти как \(name)")
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isLoading)
                    .padding(.horizontal, 24)

                    Button("Создать новый профиль") { showNameInput = true }
                        .font(.subheadline)
                        .foregroundStyle(.blue)
                        .padding(.top, 8)

                    Spacer()
                }
                .frame(maxWidth: .infinity)
                .background(GrainyBackgroundView())
                .navigationTitle("Вход без регистрации")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Отмена") { dismiss() }
                    }
                }
            } else {
                VStack(spacing: 24) {
                    Text("Укажите имя для бронирований")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.top, 24)

                    TextField("Ваше имя", text: $displayName)
                        .textContentType(.name)
                        .padding(16)
                        .background(Color(.tertiarySystemFill))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .padding(.horizontal, 24)

                    if let err = errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .padding(.horizontal)
                    }

                    Text("Сессия сохранится на 90 дней. Вы сможете бронировать подарки и просматривать свои брони.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)

                    Spacer()
                }
                .background(GrainyBackgroundView())
                .navigationTitle("Вход без регистрации")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Отмена") { dismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Войти") { submit() }
                            .disabled(isLoading || displayName.trimmingCharacters(in: .whitespaces).count < 2)
                    }
                }
            }
        }
    }

    private func restoreProfile(name: String) {
        errorMessage = nil
        isLoading = true
        Task { @MainActor in
            do {
                try await AuthService.shared.guestLogin(displayName: name)
                onSuccess()
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func submit() {
        let name = displayName.trimmingCharacters(in: .whitespaces)
        guard name.count >= 2 else {
            errorMessage = "Минимум 2 символа"
            return
        }
        errorMessage = nil
        isLoading = true
        Task { @MainActor in
            do {
                try await AuthService.shared.guestLogin(displayName: name)
                onSuccess()
            } catch APIError.server(_, let msg) {
                errorMessage = msg ?? "Ошибка"
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
