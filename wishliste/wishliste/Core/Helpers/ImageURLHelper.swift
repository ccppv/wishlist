import Foundation

enum ImageURLHelper {
    private static let baseURL: String = {
        Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String ?? "http://localhost:8000"
    }()

    static func fullURL(for path: String?) -> URL? {
        guard let path = path, !path.isEmpty else { return nil }
        if path.hasPrefix("http") { return URL(string: path) }
        let base = baseURL.hasSuffix("/") ? String(baseURL.dropLast()) : baseURL
        let combined = path.hasPrefix("/") ? base + path : base + "/" + path
        return URL(string: combined)
    }
}
