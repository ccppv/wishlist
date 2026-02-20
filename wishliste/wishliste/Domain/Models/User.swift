import Foundation

struct User: Codable, Equatable {
    let id: Int
    let email: String
    let username: String
    var fullName: String?
    var avatarUrl: String?
    let emailVerified: Bool
    var googleId: String?
    var onboardingCompleted: Bool
    var isActive: Bool
    let isSuperuser: Bool
    let createdAt: String
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, email, username, isActive, isSuperuser
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
        case emailVerified = "email_verified"
        case googleId = "google_id"
        case onboardingCompleted = "onboarding_completed"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        email = try c.decode(String.self, forKey: .email)
        username = try c.decode(String.self, forKey: .username)
        fullName = try c.decodeIfPresent(String.self, forKey: .fullName)
        avatarUrl = try c.decodeIfPresent(String.self, forKey: .avatarUrl)
        emailVerified = try c.decodeIfPresent(Bool.self, forKey: .emailVerified) ?? false
        googleId = try c.decodeIfPresent(String.self, forKey: .googleId)
        onboardingCompleted = try c.decodeIfPresent(Bool.self, forKey: .onboardingCompleted) ?? false
        isActive = try c.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
        isSuperuser = try c.decodeIfPresent(Bool.self, forKey: .isSuperuser) ?? false
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt) ?? ""
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(email, forKey: .email)
        try c.encode(username, forKey: .username)
        try c.encodeIfPresent(fullName, forKey: .fullName)
        try c.encodeIfPresent(avatarUrl, forKey: .avatarUrl)
        try c.encode(emailVerified, forKey: .emailVerified)
        try c.encodeIfPresent(googleId, forKey: .googleId)
        try c.encode(onboardingCompleted, forKey: .onboardingCompleted)
        try c.encode(isActive, forKey: .isActive)
        try c.encode(isSuperuser, forKey: .isSuperuser)
        try c.encode(createdAt, forKey: .createdAt)
        try c.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}

struct UserPublic: Codable {
    let id: Int
    let username: String
    let fullName: String?
    let avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, username
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
    }
}
