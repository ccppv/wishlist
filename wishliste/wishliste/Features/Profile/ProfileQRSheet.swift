import CoreImage
import SwiftUI

struct ProfileQRSheet: View {
    let profileUrl: URL
    var onDismiss: () -> Void

    @State private var qrMatrix: [[Bool]] = []
    @State private var qrImage: UIImage?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if !qrMatrix.isEmpty {
                    DottedQRView(matrix: qrMatrix, size: 240)
                        .padding()
                }
                Text("Сканируйте для перехода в профиль")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                HStack(spacing: 16) {
                    Button {
                        if let img = qrImage {
                            let av = UIActivityViewController(activityItems: [profileUrl, img], applicationActivities: nil)
                            if let w = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                               let root = w.windows.first?.rootViewController {
                                root.present(av, animated: true)
                            }
                        }
                    } label: {
                        Label("Поделиться", systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    Button {
                        if let img = qrImage {
                            let av = UIActivityViewController(activityItems: [img], applicationActivities: nil)
                            if let w = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                               let root = w.windows.first?.rootViewController {
                                root.present(av, animated: true)
                            }
                        }
                    } label: {
                        Label("Скачать", systemImage: "square.and.arrow.down")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .padding(.horizontal, 24)
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(GrainyBackgroundView())
            .navigationTitle("QR-код профиля")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Закрыть") { onDismiss() }
                }
            }
            .onAppear { generateQR() }
        }
    }

    private func generateQR() {
        let data = profileUrl.absoluteString.data(using: .utf8)
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("H", forKey: "inputCorrectionLevel")
        guard let output = filter.outputImage else { return }

        let w = Int(output.extent.width)
        let h = Int(output.extent.height)
        let context = CIContext()
        guard let cgImage = context.createCGImage(output, from: output.extent) else { return }

        let colorSpace = CGColorSpaceCreateDeviceGray()
        let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue)
        var pixelData = [UInt8](repeating: 0, count: w * h)
        guard let ctx = CGContext(data: &pixelData, width: w, height: h, bitsPerComponent: 8,
                                 bytesPerRow: w, space: colorSpace, bitmapInfo: bitmapInfo.rawValue) else { return }
        ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: w, height: h))

        var matrix: [[Bool]] = []
        for y in 0..<h {
            var row: [Bool] = []
            for x in 0..<w {
                let idx = y * w + x
                row.append(pixelData[idx] < 128)
            }
            matrix.append(row)
        }
        qrMatrix = matrix
        qrImage = renderDottedImage(matrix: matrix, size: 512)
    }

    private func renderDottedImage(matrix: [[Bool]], size: Int) -> UIImage? {
        let n = matrix.count
        guard n > 0 else { return nil }
        let dotSize = CGFloat(size) / CGFloat(n) * 0.7
        let spacing = CGFloat(size) / CGFloat(n)

        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size))
        let img = renderer.image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
            UIColor.black.setFill()
            for y in 0..<n {
                for x in 0..<n where matrix[y][x] {
                    let cx = CGFloat(x) * spacing + spacing / 2
                    let cy = CGFloat(y) * spacing + spacing / 2
                    let rect = CGRect(x: cx - dotSize/2, y: cy - dotSize/2, width: dotSize, height: dotSize)
                    ctx.cgContext.fillEllipse(in: rect)
                }
            }
        }
        return img
    }
}

private struct DottedQRView: View {
    let matrix: [[Bool]]
    let size: CGFloat

    var body: some View {
        let n = matrix.count
        Group {
            if n > 0 {
                Canvas { context, _ in
                    let dotSize = size / CGFloat(n) * 0.7
                    let spacing = size / CGFloat(n)
                    for y in 0..<n {
                        for x in 0..<n where matrix[y][x] {
                            let cx = CGFloat(x) * spacing + spacing / 2
                            let cy = CGFloat(y) * spacing + spacing / 2
                            let rect = CGRect(x: cx - dotSize/2, y: cy - dotSize/2, width: dotSize, height: dotSize)
                            context.fill(Path(ellipseIn: rect), with: .color(.primary))
                        }
                    }
                }
                .frame(width: size, height: size)
            }
        }
    }
}
