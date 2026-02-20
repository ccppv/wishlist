import SwiftUI
import UIKit

struct AuthField: View {
    let placeholder: String
    @Binding var text: String
    var hasError: Bool = false
    var contentType: UITextContentType = .username
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        TextField(placeholder, text: $text)
            .textContentType(contentType)
            .keyboardType(keyboardType)
            .autocapitalization(.none)
            .textInputAutocapitalization(.never)
            .font(.body)
            .padding(.horizontal, 16)
            .frame(height: 56)
            .background(Color(.tertiarySystemFill))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(hasError ? Color.red.opacity(0.5) : Color.clear, lineWidth: 1)
            )
    }
}

struct AuthPasswordField: View {
    let placeholder: String
    @Binding var password: String
    @Binding var showPassword: Bool
    var hasError: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            Group {
                if showPassword {
                    TextField(placeholder, text: $password)
                        .textContentType(.newPassword)
                } else {
                    SecureField(placeholder, text: $password)
                        .textContentType(.newPassword)
                }
            }
            .font(.body)
            .padding(.horizontal, 16)
            .frame(height: 56)
            .background(Color(.tertiarySystemFill))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(hasError ? Color.red.opacity(0.5) : Color.clear, lineWidth: 1)
            )

            Button(action: { showPassword.toggle() }) {
                Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
