import SwiftUI
import PhotosUI

struct PhotoPickerSheet: View {
    @Binding var selectedItem: PhotosPickerItem?
    var onDismiss: () -> Void

    var body: some View {
        NavigationStack {
            PhotosPicker(selection: $selectedItem, matching: .images) {
                Label("Выберите фото", systemImage: "photo.on.rectangle.angled")
                    .font(.footnote)
            }
            .padding()
            .navigationTitle("Обложка")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена", action: onDismiss)
                        .font(.footnote)
                }
            }
        }
    }
}
