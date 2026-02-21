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
}
