import SwiftUI

struct GrainyBackgroundView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        (colorScheme == .dark ? Color(white: 0.12) : Color(.systemGray6))
            .overlay(GrainOverlay())
            .ignoresSafeArea()
    }
}

private struct GrainOverlay: View {
    var body: some View {
        GeometryReader { _ in
            Canvas { context, size in
                var rng = SeededRandom(seed: 12345)
                let grainOpacity: Double = 0.18
                let dotCount = Int(size.width * size.height / 80)
                for _ in 0..<dotCount {
                    let x = CGFloat(rng.next()) * size.width
                    let y = CGFloat(rng.next()) * size.height
                    let r = CGFloat(rng.next()) * 0.5 + 0.3
                    let rect = CGRect(x: x, y: y, width: r, height: r)
                    context.fill(Path(ellipseIn: rect), with: .color(.primary.opacity(grainOpacity)))
                }
            }
        }
        .drawingGroup()
        .allowsHitTesting(false)
    }
}

private struct SeededRandom {
    private var state: UInt64
    init(seed: Int) { state = UInt64(truncatingIfNeeded: seed) }
    mutating func next() -> Double {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return Double(state >> 11) / Double(UInt64.max)
    }
}
