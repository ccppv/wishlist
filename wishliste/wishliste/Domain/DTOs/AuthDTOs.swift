import Foundation

struct UserCreate: Encodable {
    let email: String
    let username: String
    let password: String
    let fullName: String?

    enum CodingKeys: String, CodingKey {
        case email, username, password
        case fullName = "full_name"
    }
}

struct TokenWithUser: Codable {
    let accessToken: String
    let refreshToken: String?
    let tokenType: String?
    let user: User

    enum CodingKeys: String, CodingKey {
        case accessToken
        case refreshToken
        case tokenType
        case user
    }
}

struct RegisterResponse: Codable {
    let message: String
    let email: String
}

struct VerifyEmailRequest: Encodable {
    let email: String
    let code: String
}

struct ResendCodeRequest: Encodable {
    let email: String
}

struct ForgotPasswordRequest: Encodable {
    let email: String
}

struct LoginForm: Encodable {
    let username: String
    let password: String

    static func formData(username: String, password: String) -> [String: String] {
        ["username": username, "password": password]
    }
}
