import Foundation

enum URLValidation {
    static func safeUsername(_ s: String) -> String? {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "_-"))
        guard !s.isEmpty, s.utf8.count <= 50, s.unicodeScalars.allSatisfy({ allowed.contains($0) }) else { return nil }
        return s
    }

    static func safeShareToken(_ s: String) -> String? {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "_-"))
        guard !s.isEmpty, s.utf8.count <= 64, s.unicodeScalars.allSatisfy({ allowed.contains($0) }) else { return nil }
        return s
    }

    static let maxURLLength = 2048

    struct URLResult {
        let isValid: Bool
        let normalized: String?
        let error: String?
    }

    static func validateURL(_ s: String) -> URLResult {
        let trimmed = s.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return URLResult(isValid: true, normalized: nil, error: nil)
        }
        guard trimmed.count <= maxURLLength else {
            return URLResult(isValid: false, normalized: nil, error: "Ссылка слишком длинная")
        }
        var str = trimmed
        if !str.lowercased().hasPrefix("http://") && !str.lowercased().hasPrefix("https://") {
            str = "https://" + str
        }
        guard let url = URL(string: str),
              let scheme = url.scheme,
              (scheme == "http" || scheme == "https"),
              url.host != nil else {
            return URLResult(isValid: false, normalized: nil, error: "Некорректная ссылка")
        }
        return URLResult(isValid: true, normalized: str, error: nil)
    }

    static func safeURL(_ s: String) -> String? {
        let result = validateURL(s)
        return result.isValid ? result.normalized : nil
    }
}
