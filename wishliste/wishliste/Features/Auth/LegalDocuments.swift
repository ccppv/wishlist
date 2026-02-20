import Foundation

enum LegalDocuments {
    static func loadTerms() -> String {
        guard let url = Bundle.main.url(forResource: "TermsOfService", withExtension: "md"),
              let data = try? Data(contentsOf: url),
              let text = String(data: data, encoding: .utf8) else {
            return "Документ недоступен."
        }
        return text
    }

    static func loadPrivacy() -> String {
        guard let url = Bundle.main.url(forResource: "PrivacyPolicy", withExtension: "md"),
              let data = try? Data(contentsOf: url),
              let text = String(data: data, encoding: .utf8) else {
            return "Документ недоступен."
        }
        return text
    }
}
