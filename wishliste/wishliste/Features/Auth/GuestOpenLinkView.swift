import SwiftUI

struct GuestOpenLinkView: View {
    @State private var linkInput = ""
    @State private var openToken: GuestShareToken?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Вставьте ссылку на вишлист")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    TextField("Ссылка или токен", text: $linkInput)
                        .textContentType(.URL)
                        .autocapitalization(.none)
                        .padding(16)
                        .background(Color(.tertiarySystemFill))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, 24)
                .padding(.top, 32)

                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }

                Button(action: openLink) {
                    Text("Открыть")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                }
                .buttonStyle(.borderedProminent)
                .disabled(linkInput.trimmingCharacters(in: .whitespaces).isEmpty)
                .padding(.horizontal, 24)

                Spacer()
            }
            .background(GrainyBackgroundView())
            .navigationTitle("Открыть вишлист")
            .navigationBarTitleDisplayMode(.inline)
            .fullScreenCover(item: $openToken) { wrapper in
                PublicWishlistView(shareToken: wrapper.token, onDismiss: { openToken = nil })
            }
        }
    }

    private func openLink() {
        let raw = linkInput.trimmingCharacters(in: .whitespaces)
        guard !raw.isEmpty else { return }
        errorMessage = nil
        let token = extractShareToken(from: raw)
        openToken = GuestShareToken(token: token)
    }

    private func extractShareToken(from input: String) -> String {
        if input.contains("/wl/") {
            let parts = input.components(separatedBy: "/wl/")
            if parts.count > 1 {
                let after = parts[1]
                if let q = after.firstIndex(of: "?") {
                    return String(after[..<q])
                }
                return String(after)
            }
        }
        return input
    }
}

private struct GuestShareToken: Identifiable {
    let token: String
    var id: String { token }
}
