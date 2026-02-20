import SwiftUI

private let EMOJI_GRID = "🎁🎂🎄🎉⭐🌟💝🎈❤️🌸🌺🍩🍰🎊🎀🏠🎋🎌🎍🎎🎏🎐🎑🎒🎓".map { String($0) }

struct EmojiPickerSheet: View {
    var onSelect: (String) -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 6), spacing: 12) {
                    ForEach(EMOJI_GRID, id: \.self) { emoji in
                        Button {
                            onSelect(emoji)
                        } label: {
                            Text(emoji)
                                .font(.system(size: 32))
                                .frame(width: 44, height: 44)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Выберите эмодзи")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { onSelect("") }
                }
            }
        }
    }
}
