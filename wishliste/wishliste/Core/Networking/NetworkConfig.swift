import Foundation

enum NetworkConfig {
    static var baseURLString: String {
        if let override = ProcessInfo.processInfo.environment["API_BASE_URL"], !override.isEmpty {
            return override.hasSuffix("/") ? String(override.dropLast()) : override
        }
        if let fromBundle = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String, !fromBundle.isEmpty {
            let s = fromBundle.hasSuffix("/") ? String(fromBundle.dropLast()) : fromBundle
            return s.replacingOccurrences(of: "localhost", with: "192.168.1.1")
                    .replacingOccurrences(of: "127.0.0.1", with: "192.168.1.1")
        }
        return "http://192.168.1.1:8000"
    }

    static var baseURL: URL {
        guard let url = URL(string: baseURLString) else {
            return URL(string: "http://192.168.1.1:8000")!
        }
        return url
    }

    static var apiBaseURL: String {
        let base = baseURLString
        return base.hasSuffix("/api/v1") ? base : "\(base)/api/v1"
    }
}
