import SwiftUI

enum AuthStyles {
    static let fieldHeight: CGFloat = 56
    static let fieldCornerRadius: CGFloat = 12
    static let spacing: CGFloat = 20
    static let horizontalPadding: CGFloat = 24
    static let titleTopPadding: CGFloat = 56
}

struct AuthTextFieldStyle: ViewModifier {
    var hasError: Bool = false

    func body(content: Content) -> some View {
        content
            .font(.body)
            .padding(.horizontal, 16)
            .frame(height: AuthStyles.fieldHeight)
            .background(Color(.tertiarySystemFill))
            .clipShape(RoundedRectangle(cornerRadius: AuthStyles.fieldCornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: AuthStyles.fieldCornerRadius)
                    .stroke(hasError ? Color.red.opacity(0.6) : Color.clear, lineWidth: 1)
            )
    }
}
