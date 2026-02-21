import Foundation

enum JWTValidator {
    static func isExpired(_ token: String) -> Bool {
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return true }
        guard let data = Data(base64Encoded: String(parts[1]).base64PaddingFixed) else { return true }
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let exp = json["exp"] as? TimeInterval else { return false }
        return Date().timeIntervalSince1970 >= exp
    }
}

private extension String {
    var base64PaddingFixed: String {
        let remainder = count % 4
        if remainder == 0 { return self }
        return padding(toLength: count + 4 - remainder, withPad: "=", startingAt: 0)
    }
}
