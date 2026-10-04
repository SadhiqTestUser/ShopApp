// Offline asset preparation using macOS AppKit; no runtime/package dependency.
// Source: the product thumbnail supplied for Personalized Name Pen.
// Run from the repository root: swift scripts/prepare-name-pen-photo.swift
import AppKit

let sourceURL = URL(fileURLWithPath: "public/name-pen/source-photo.webp")
guard let image = NSImage(contentsOf: sourceURL),
      let tiff = image.tiffRepresentation,
      let source = NSBitmapImageRep(data: tiff) else {
    fatalError("Cannot read the supplied pen photograph")
}

let width = source.pixelsWide, height = source.pixelsHigh
let output = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: width * 4, bitsPerPixel: 32)!

// Work in barrel-aligned coordinates for retouching while keeping the original
// photograph's orientation, composition, case, shadows and metal reflections.
let origin = CGPoint(x: 212.72, y: 367.96)
let angle = atan2(-115.6518, 93.9671)
let axis = CGPoint(x: cos(angle), y: sin(angle))
let normal = CGPoint(x: -sin(angle), y: cos(angle))
let nameCenter = CGPoint(x: 335, y: 150)

func sourcePixel(_ x: Int, _ y: Int) -> [Double] {
    guard x >= 0, x < source.pixelsWide, y >= 0, y < source.pixelsHigh else {
        return [1, 1, 1]
    }
    let c = source.colorAt(x: x, y: y)!.usingColorSpace(.deviceRGB)!
    return [Double(c.redComponent), Double(c.greenComponent), Double(c.blueComponent)]
}

func photograph(_ x: Double, _ y: Double) -> [Double] {
    let along = x - nameCenter.x, across = y - nameCenter.y
    let sx = Double(origin.x + axis.x * along + normal.x * across)
    let sy = Double(origin.y + axis.y * along + normal.y * across)
    let ix = Int(floor(sx)), iy = Int(floor(sy))
    let fx = sx - Double(ix), fy = sy - Double(iy)
    let a = sourcePixel(ix, iy), b = sourcePixel(ix + 1, iy)
    let c = sourcePixel(ix, iy + 1), d = sourcePixel(ix + 1, iy + 1)
    return (0..<3).map { channel in
        let top = a[channel] * (1-fx) + b[channel] * fx
        let bottom = c[channel] * (1-fx) + d[channel] * fx
        return top * (1-fy) + bottom * fy
    }
}

// Replace only the existing sample inscription using real, adjacent barrel
// texture. Each scanline keeps the cylinder's original highlight/shadow profile.
// Feathering avoids a visible rectangular patch around the engraving area.
for y in 0..<height {
    for x in 0..<width {
        var rgb = sourcePixel(x, y)
        let offsetX = Double(x) - origin.x, offsetY = Double(y) - origin.y
        let alignedX = nameCenter.x + offsetX * axis.x + offsetY * axis.y
        let alignedY = nameCenter.y + offsetX * normal.x + offsetY * normal.y
        let dx = abs(alignedX - nameCenter.x)
        let dy = abs(alignedY - nameCenter.y)
        let alpha = min(1, max(0, (83 - dx) / 5)) * min(1, max(0, (20 - dy) / 3))
        if alpha > 0 {
            let t = Double(min(1, max(0, (alignedX - 252) / 166)))
            let textureOffset = Double(Int(alignedX) % 9)
            let left = photograph(242 + textureOffset, Double(alignedY))
            let right = photograph(421 + textureOffset, Double(alignedY))
            for channel in 0..<3 {
                let clean = left[channel] * (1-t) + right[channel] * t
                rgb[channel] = rgb[channel] * (1-alpha) + clean * alpha
            }
        }
        output.setColor(NSColor(deviceRed: rgb[0], green: rgb[1], blue: rgb[2], alpha: 1), atX: x, y: y)
    }
}

let target = URL(fileURLWithPath: "public/name-pen/preview-photo.jpg")
try output.representation(using: .jpeg, properties: [.compressionFactor: 0.94])!.write(to: target)
print("Prepared real pen photograph: \(width) × \(height)")