import SwiftUI

enum ColorSchemeChoice: String, CaseIterable {
    case system
    case light
    case dark
}

@Observable
final class AppTheme {
    static let shared = AppTheme()
    private let key = "wishlist_theme"

    var choice: ColorSchemeChoice {
        get {
            guard let raw = UserDefaults.standard.string(forKey: key),
                  let v = ColorSchemeChoice(rawValue: raw) else { return .system }
            return v
        }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: key) }
    }

    var colorScheme: ColorScheme? {
        switch choice {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }

    private init() {}
}
