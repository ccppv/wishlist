import SwiftUI

struct ReserveSheet: View {
    let item: Item
    let isAuthenticated: Bool
    let onReserved: () -> Void
    let onDismiss: () -> Void

    @State private var partialAmount = ""
    @State private var guestName = ""
    @State private var isReserving = false
    @State private var errorMessage: String?
    @FocusState private var amountFocused: Bool

    private let api = ItemsAPI()

    private var maxAvailable: Decimal {
        guard let price = item.price, price > 0 else { return 0 }
        let collected = item.collectedAmount
        return max(0, price - collected)
    }

    private var hasPartialReservation: Bool {
        item.collectedAmount > 0 && !item.isReserved
    }

    private var canReserve: Bool {
        isAuthenticated || !guestName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private var nameForApi: String? {
        isAuthenticated ? nil : (guestName.trimmingCharacters(in: .whitespaces).isEmpty ? nil : guestName.trimmingCharacters(in: .whitespaces))
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Бронирование")
                    .font(.headline)
                Spacer()
                Button("Отмена") { onDismiss() }
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)

            VStack(alignment: .leading, spacing: 12) {
                Text(item.title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)

                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                }

                if !isAuthenticated {
                    TextField("Ваше имя", text: $guestName)
                        .textContentType(.name)
                        .padding(12)
                        .background(Color(.secondarySystemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                if let price = item.price, price > 0 {
                    TextField("Сумма", text: $partialAmount)
                        .keyboardType(.decimalPad)
                        .focused($amountFocused)
                        .padding(12)
                        .background(Color(.secondarySystemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .onChange(of: partialAmount) { _, newValue in
                            if let val = Decimal(string: newValue.replacingOccurrences(of: ",", with: ".")),
                               val > maxAvailable, maxAvailable > 0 {
                                partialAmount = String(describing: maxAvailable)
                            }
                        }

                    Text("Доступно: \(String(describing: maxAvailable)) \(item.currency)")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }

                if hasPartialReservation {
                    Button {
                        reservePartial()
                    } label: {
                        Text("Забронировать частично")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isReserving || partialAmount.isEmpty || !canReserve)
                } else if let price = item.price, price > 0 {
                    Button {
                        reserveFull()
                    } label: {
                        Text("Забронировать целиком")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isReserving || !canReserve)

                    Button {
                        reservePartial()
                    } label: {
                        Text("Забронировать частично")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.bordered)
                    .disabled(isReserving || partialAmount.isEmpty || !canReserve)
                } else {
                    Button {
                        reserveFull()
                    } label: {
                        Text("Забронировать целиком")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isReserving || !canReserve)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 24)
        }
        .frame(maxWidth: .infinity)
        .background(GrainyBackgroundView())
        .presentationDetents([.height(isAuthenticated ? 320 : 380)])
        .presentationDragIndicator(.visible)
        .onAppear {
            if let dn = GuestSessionStore.shared.displayName, !isAuthenticated && guestName.isEmpty {
                guestName = dn
            }
        }
    }

    private func reserveFull() {
        guard canReserve else { return }
        if !isAuthenticated && guestName.trimmingCharacters(in: .whitespaces).isEmpty {
            errorMessage = "Введите имя"
            return
        }
        isReserving = true
        errorMessage = nil
        Task {
            do {
                _ = try await api.reserve(itemId: item.id, amount: nil, name: nameForApi)
                await MainActor.run {
                    onReserved()
                    onDismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
                }
            }
            await MainActor.run { isReserving = false }
        }
    }

    private func reservePartial() {
        guard canReserve else { return }
        if !isAuthenticated && guestName.trimmingCharacters(in: .whitespaces).isEmpty {
            errorMessage = "Введите имя"
            return
        }
        guard let amount = Double(partialAmount.replacingOccurrences(of: ",", with: ".")), amount > 0 else {
            errorMessage = "Введите сумму"
            return
        }
        let amountDecimal = Decimal(amount)
        if amountDecimal > maxAvailable {
            errorMessage = "Максимум \(maxAvailable) \(item.currency)"
            return
        }
        isReserving = true
        errorMessage = nil
        Task {
            do {
                _ = try await api.reserve(itemId: item.id, amount: amount, name: nameForApi)
                await MainActor.run {
                    onReserved()
                    onDismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = (error as? APIError).flatMap { if case .server(_, let m) = $0 { return m }; return nil } ?? error.localizedDescription
                }
            }
            await MainActor.run { isReserving = false }
        }
    }
}
