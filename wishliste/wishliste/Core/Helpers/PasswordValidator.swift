import Foundation

enum PasswordValidator {
    static let minLength = 8
    static let maxLength = 128

    struct Result {
        let isValid: Bool
        let errors: [String]
    }

    static func validate(_ password: String) -> Result {
        var errors: [String] = []
        if password.count < minLength {
            errors.append("Минимум \(minLength) символов")
        }
        if password.count > maxLength {
            errors.append("Максимум \(maxLength) символов")
        }
        if !password.contains(where: { $0.isUppercase }) {
            errors.append("Хотя бы одна заглавная буква")
        }
        if !password.contains(where: { $0.isLowercase }) {
            errors.append("Хотя бы одна строчная буква")
        }
        if !password.contains(where: { $0.isNumber }) {
            errors.append("Хотя бы одна цифра")
        }
        let special = CharacterSet(charactersIn: "!@#$%^&*()_+-=[]{}|;:,.<>?")
        if !password.unicodeScalars.contains(where: { special.contains($0) }) {
            errors.append("Хотя бы один спецсимвол (!@#$%^&* и т.д.)")
        }
        return Result(isValid: errors.isEmpty, errors: errors)
    }

    static func isValid(_ password: String) -> Bool {
        validate(password).isValid
    }
}
