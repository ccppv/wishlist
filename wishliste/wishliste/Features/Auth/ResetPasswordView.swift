import SwiftUI

struct ResetPasswordView: View {
    @State private var email = ""
    @State private var message: String?
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 16) {
            Text("Восстановление пароля")
                .font(.title2.bold())
                .padding(.top)

            Text("Введите email — мы отправим инструкции.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            TextField("Email", text: $email)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .padding(12)
                .background(Color(.systemBackground).opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 12))

            if let m = message {
                Text(m)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Button(action: send) {
                if isLoading { ProgressView().frame(maxWidth: .infinity).padding() }
                else { Text("Отправить").frame(maxWidth: .infinity).padding() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(email.isEmpty)

            Spacer()
        }
        .padding()
    }

    private func send() {
        // Placeholder: интеграция с бэкендом восстановления пароля
        isLoading = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            message = "Если аккаунт существует — инструкции отправлены на почту"
            isLoading = false
        }
    }
}

struct ResetPasswordView_Previews: PreviewProvider {
    static var previews: some View { ResetPasswordView() }
}
