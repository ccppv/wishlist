import SwiftUI

struct ReserveItemView: View {
    let item: Item
    var onReserved: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var amountStr = ""
    @State private var errorMessage: String?
    @State private var isLoading = false

    private let api = ItemsAPI()
    private let authStore = AuthStore.shared
    private var guestName: String? {
        authStore.isAuthenticated ? nil : (name.trimmingCharacters(in: .whitespaces).isEmpty ? nil : name.trimmingCharacters(in: .whitespaces))
    }

    var body: some View {
        NavigationStack {
            Form {
                if !authStore.isAuthenticated {
                    Section("Ваше имя") {
                        TextField("Имя", text: $name)
                    }
                }
                if item.price != nil && item.price! > 0 {
                    Section("Сумма (оставьте пустым для полной резервации)") {
                        TextField("Сумма", text: $amountStr)
                            .keyboardType(.decimalPad)
                    }
                }
                if let err = errorMessage {
                    Section { Text(err).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Забронировать")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Забронировать") { reserve() }
                        .disabled(isLoading || (!authStore.isAuthenticated && guestName == nil))
                }
            }
        }
    }

    private func reserve() {
        guard authStore.isAuthenticated || guestName != nil else { return }
        errorMessage = nil
        isLoading = true
        let amount: Double? = Double(amountStr.trimmingCharacters(in: .whitespaces))
        Task {
            do {
                _ = try await api.reserve(itemId: item.id, amount: amount, name: guestName)
                onReserved()
                dismiss()
            } catch {
                errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
            }
            isLoading = false
        }
    }
}
