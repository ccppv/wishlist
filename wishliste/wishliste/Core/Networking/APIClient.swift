import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case noData
    case decoding(Error)
    case server(Int, String?)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Неверный URL"
        case .noData: return "Нет данных от сервера"
        case .decoding(let e): return "Ошибка формата: \(e.localizedDescription)"
        case .server(let code, let m): return m ?? "Ошибка сервера (\(code))"
        case .unauthorized: return "Сессия истекла"
        }
    }
}

final class APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession
    private var tokenProvider: (() -> String?)?
    private var refreshHandler: (() async -> Bool)?

    private init(baseURL: String? = nil) {
        self.baseURL = baseURL ?? NetworkConfig.apiBaseURL
        self.session = URLSession.shared
    }

    func setTokenProvider(_ provider: @escaping () -> String?) {
        tokenProvider = provider
    }

    func setRefreshHandler(_ handler: (() async -> Bool)?) {
        refreshHandler = handler
    }

    func request<T: Decodable>(
        _ endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        query: [String: String] = [:],
        formFields: [String: String] = [:],
        formFile: (key: String, filename: String, data: Data, mimeType: String)? = nil,
        useMultipart: Bool = false,
        extraHeaders: [String: String] = [:]
    ) async throws -> T {
        let path = endpoint.hasPrefix("/") ? endpoint : "/\(endpoint)"
        var urlString = "\(baseURL)\(path)"
        if !query.isEmpty {
            let q = query.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.value)" }.joined(separator: "&")
            urlString += "?" + q
        }
        guard let url = URL(string: urlString) else { throw APIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = method

        if let token = tokenProvider?() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        for (k, v) in extraHeaders {
            request.setValue(v, forHTTPHeaderField: k)
        }

        if let file = formFile {
            let boundary = "Boundary-\(UUID().uuidString)"
            request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            request.httpBody = multipartBody(boundary: boundary, fields: formFields, fileKey: file.key, fileName: file.filename, fileData: file.data, mimeType: file.mimeType)
        } else if !formFields.isEmpty {
            if useMultipart {
                let boundary = "Boundary-\(UUID().uuidString)"
                request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
                request.httpBody = multipartBodyFieldsOnly(boundary: boundary, fields: formFields)
            } else {
                request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
                let encoded = formFields.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.value)" }.joined(separator: "&")
                request.httpBody = encoded.data(using: .utf8)
            }
        } else if let body = body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder.api.encode(AnyEncodable(value: body))
        }

        let hasAuth = request.value(forHTTPHeaderField: "Authorization") != nil
        let bodyLen = request.httpBody?.count ?? 0
        if bodyLen > 0 {
            #if DEBUG
            print("[API] \(method) \(path) | body: \(bodyLen) bytes")
            #endif
        } else {
            #if DEBUG
            print("[API] \(method) \(path)")
            #endif
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.noData }
        #if DEBUG
        print("[API] \(method) \(path) | Status: \(http.statusCode)")
        #endif

        if http.statusCode == 401 {
            let canRetry = path.contains("/auth/refresh") == false && path.contains("/auth/login") == false && path.contains("/auth/verify-email") == false && path.contains("/auth/register") == false
            if canRetry, let handler = refreshHandler, await handler() {
                return try await self.request(endpoint, method: method, body: body, query: query, formFields: formFields, formFile: formFile, useMultipart: useMultipart, extraHeaders: extraHeaders)
            }
            throw APIError.unauthorized
        }
        if http.statusCode >= 400 {
            let message = parseErrorMessage(from: data) ?? String(data: data, encoding: .utf8)
            throw APIError.server(http.statusCode, message)
        }

        if T.self == EmptyResponse.self {
            guard let r = EmptyResponse() as? T else { throw APIError.decoding(NSError(domain: "API", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response type"])) }
            return r
        }
        if let preview = String(data: data.prefix(100), encoding: .utf8), preview.trimmingCharacters(in: .whitespaces).hasPrefix("<") {
            throw APIError.server(200, "Сервер вернул HTML вместо JSON. Проверьте API_BASE_URL — должен указывать на backend API.")
        }
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           json["access_token"] == nil,
           let detail = json["detail"] as? String {
            throw APIError.server(http.statusCode, detail)
        }
        if T.self == TokenWithUser.self,
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           json["access_token"] == nil,
           json["message"] != nil,
           json["email"] != nil {
            throw APIError.server(200, "Сервер вернул ответ регистрации вместо токена. Отправьте код повторно и введите его.")
        }
        let decoder: JSONDecoder
        if T.self == [WishlistSummary].self || T.self == WishlistSummary.self || T.self == Wishlist.self || T.self == Item.self || T.self == [Item].self || T.self == [Friendship].self || T.self == Friendship.self || T.self == [ReservedItemDetail].self {
            let d = JSONDecoder()
            decoder = d
        } else {
            decoder = JSONDecoder.api
        }
        do {
            let result = try decoder.decode(T.self, from: data)
            return result
        } catch let decodingError as DecodingError {
            _ = decodingError
            if T.self == TokenWithUser.self {
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let wrapped = json["data"] as? [String: Any],
                   wrapped["access_token"] != nil,
                   let wrappedData = try? JSONSerialization.data(withJSONObject: wrapped),
                   let result = try? decoder.decode(TokenWithUser.self, from: wrappedData),
                   let cast = result as? T {
                    return cast
                }
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   json["access_token"] != nil {
                    let d = JSONDecoder()
                    d.keyDecodingStrategy = .convertFromSnakeCase
                    if let result = try? d.decode(TokenWithUser.self, from: data),
                       let cast = result as? T {
                        return cast
                    }
                }
            }
            throw APIError.decoding(decodingError)
        }
    }

    func requestReturningResponse<T: Decodable>(
        _ endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        query: [String: String] = [:],
        extraHeaders: [String: String] = [:]
    ) async throws -> (T, HTTPURLResponse) {
        let path = endpoint.hasPrefix("/") ? endpoint : "/\(endpoint)"
        var urlString = "\(baseURL)\(path)"
        if !query.isEmpty {
            let q = query.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? $0.value)" }.joined(separator: "&")
            urlString += "?" + q
        }
        guard let url = URL(string: urlString) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = method
        if let token = tokenProvider?() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        for (k, v) in extraHeaders {
            request.setValue(v, forHTTPHeaderField: k)
        }
        if let body = body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder.api.encode(AnyEncodable(value: body))
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.noData }
        if http.statusCode == 401 { throw APIError.unauthorized }
        if http.statusCode >= 400 {
            let message = parseErrorMessage(from: data) ?? String(data: data, encoding: .utf8)
            throw APIError.server(http.statusCode, message)
        }
        if T.self == EmptyResponse.self {
            guard let r = EmptyResponse() as? T else { throw APIError.decoding(NSError(domain: "API", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response type"])) }
            return (r, http)
        }
        let decoder: JSONDecoder
        if T.self == [WishlistSummary].self || T.self == WishlistSummary.self || T.self == Wishlist.self || T.self == Item.self || T.self == [Item].self || T.self == [Friendship].self || T.self == Friendship.self || T.self == [ReservedItemDetail].self {
            decoder = JSONDecoder()
        } else {
            decoder = JSONDecoder.api
        }
        let result = try decoder.decode(T.self, from: data)
        return (result, http)
    }

    func upload(multipartForm: [String: Any], fileKey: String, fileData: Data, fileName: String, mimeType: String, to endpoint: String) async throws -> Data {
        let path = endpoint.hasPrefix("/") ? endpoint : "/\(endpoint)"
        let urlString = "\(baseURL)\(path)"
        guard let url = URL(string: urlString) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let token = tokenProvider?() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data()
        for (key, value) in multipartForm {
            if let str = value as? String {
                body.append("--\(boundary)\r\n".data(using: .utf8) ?? Data())
                body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8) ?? Data())
                body.append("\(str)\r\n".data(using: .utf8) ?? Data())
            }
        }
        body.append("--\(boundary)\r\n".data(using: .utf8) ?? Data())
        body.append("Content-Disposition: form-data; name=\"\(fileKey)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8) ?? Data())
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8) ?? Data())
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8) ?? Data())
        request.httpBody = body
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.noData }
        if http.statusCode == 401 { throw APIError.unauthorized }
        if http.statusCode >= 400 {
            let message = parseErrorMessage(from: data) ?? String(data: data, encoding: .utf8)
            throw APIError.server(http.statusCode, message)
        }
        return data
    }

    private func multipartBody(boundary: String, fields: [String: String], fileKey: String, fileName: String, fileData: Data, mimeType: String) -> Data {
        var body = Data()
        for (k, v) in fields {
            body.append("--\(boundary)\r\n".data(using: .utf8) ?? Data())
            body.append("Content-Disposition: form-data; name=\"\(k)\"\r\n\r\n".data(using: .utf8) ?? Data())
            body.append("\(v)\r\n".data(using: .utf8) ?? Data())
        }
        body.append("--\(boundary)\r\n".data(using: .utf8) ?? Data())
        body.append("Content-Disposition: form-data; name=\"\(fileKey)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8) ?? Data())
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8) ?? Data())
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8) ?? Data())
        return body
    }

    private func multipartBodyFieldsOnly(boundary: String, fields: [String: String]) -> Data {
        var body = Data()
        for (k, v) in fields {
            body.append("--\(boundary)\r\n".data(using: .utf8) ?? Data())
            body.append("Content-Disposition: form-data; name=\"\(k)\"\r\n\r\n".data(using: .utf8) ?? Data())
            body.append("\(v)\r\n".data(using: .utf8) ?? Data())
        }
        body.append("--\(boundary)--\r\n".data(using: .utf8) ?? Data())
        return body
    }
}

struct EmptyResponse: Decodable {}
private struct ErrorDetail: Decodable { let detail: String? }
private struct AnyEncodable: Encodable { let value: Encodable; func encode(to e: Encoder) throws { try value.encode(to: e) } }

private func parseErrorMessage(from data: Data) -> String? {
    guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let detail = json["detail"] else { return nil }
    if let str = detail as? String { return str }
    if let arr = detail as? [[String: Any]], let first = arr.first, let msg = first["msg"] as? String {
        let fieldNames: [String: String] = ["username": "Имя пользователя", "email": "Email", "password": "Пароль"]
        let loc = first["loc"] as? [String]
        let rawField = loc?.last ?? "поле"
        let field = fieldNames[rawField] ?? rawField
        let ruMsg = msg
            .replacingOccurrences(of: "String should have at least 3 characters", with: "минимум 3 символа")
            .replacingOccurrences(of: "String should have at least 6 characters", with: "минимум 6 символов")
        return "\(field): \(ruMsg)"
    }
    return nil
}

extension JSONEncoder {
    static let api: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()
}

extension JSONDecoder {
    static let api: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()
}
