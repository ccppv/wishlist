import Foundation

@MainActor
final class AuthService {
    static let shared = AuthService()
    private let client = APIClient.shared
    private let store = AuthStore.shared

    private init() {}

    func register(email: String, username: String, password: String, fullName: String?) async throws -> RegisterResponse {
        let body = UserCreate(email: email, username: username, password: password, fullName: fullName)
        return try await client.request("/auth/register", method: "POST", body: body)
    }

    func verifyEmail(email: String, code: String) async throws -> TokenWithUser {
        let body = VerifyEmailRequest(email: email, code: code)
        let result: TokenWithUser = try await client.request("/auth/verify-email", method: "POST", body: body)
        store.setAuth(accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user)
        _ = NotificationStore.shared
        WebSocketService.shared.connect(userId: result.user.id, token: result.accessToken)
        return result
    }

    func resendCode(email: String) async throws -> RegisterResponse {
        let body = ResendCodeRequest(email: email)
        return try await client.request("/auth/resend-code", method: "POST", body: body)
    }

    func login(username: String, password: String) async throws -> TokenWithUser {
        let form = LoginForm.formData(username: username, password: password)
        let result: TokenWithUser = try await client.request("/auth/login", method: "POST", formFields: form)
        store.setAuth(accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user)
        _ = NotificationStore.shared
        WebSocketService.shared.connect(userId: result.user.id, token: result.accessToken)
        return result
    }

    func refreshToken() async throws -> Bool {
        guard let rt = store.refreshToken, !rt.isEmpty else { return false }
        struct RefreshRequest: Encodable { let refreshToken: String; enum CodingKeys: String, CodingKey { case refreshToken = "refresh_token" } }
        let body = RefreshRequest(refreshToken: rt)
        let res: TokenWithUser = try await client.request("/auth/refresh", method: "POST", body: body)
        store.setAuth(accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user)
        return true
    }

    func getMe() async throws -> User {
        guard store.token != nil else { throw APIError.unauthorized }
        return try await client.request("/auth/me")
    }


    func guestLogin(displayName: String) async throws {
        let name = displayName.trimmingCharacters(in: .whitespaces)
        guard name.count >= 2 else { throw APIError.server(400, "Укажите имя (минимум 2 символа)") }
        struct Req: Encodable { let displayName: String; enum C: String, CodingKey { case displayName = "display_name" } }
        struct Resp: Decodable { let token: String; let displayName: String; let expiresInDays: Int; enum C: String, CodingKey { case displayName = "display_name"; case expiresInDays = "expires_in_days" } }
        let resp: Resp = try await client.request("/auth/guest-session", method: "POST", body: Req(displayName: name))
        GuestSessionStore.shared.setGuestSession(token: resp.token, displayName: resp.displayName)
    }

    func onboarding(fullName: String, avatarData: Data?, avatarFilename: String?) async throws -> User {
        let fields: [String: String] = ["full_name": fullName]
        let endpoint = "/auth/onboarding"
        if let data = avatarData, let name = avatarFilename, !name.isEmpty {
            return try await client.request(
                endpoint,
                method: "POST",
                formFields: fields,
                formFile: ("avatar", name, data, "image/jpeg")
            )
        }
        return try await client.request(endpoint, method: "POST", formFields: fields, useMultipart: true)
    }
}
