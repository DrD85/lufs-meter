// Draws the app icon (1024x1024 PNG): the dark rounded square of the Nano Cortex Editor's icon with a loudness gauge
// on it - an arc from green to red, the needle and the target mark in the editor's green.   swift make-icon.swift icon-1024.png
import AppKit

let size: CGFloat = 1024
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()

let inset: CGFloat = 100
let bgRect = NSRect(x: inset, y: inset, width: size - 2 * inset, height: size - 2 * inset)
let bg = NSBezierPath(roundedRect: bgRect, xRadius: 185, yRadius: 185)
NSGraphicsContext.saveGraphicsState()
bg.addClip()
NSGradient(starting: NSColor(white: 0.17, alpha: 1), ending: NSColor(white: 0.03, alpha: 1))!.draw(in: bgRect, angle: -90)
NSGraphicsContext.restoreGraphicsState()
NSColor(white: 1, alpha: 0.08).setStroke()
bg.lineWidth = 4
bg.stroke()

let center = CGPoint(x: size / 2, y: 430)
let radius: CGFloat = 290
let green = NSColor(red: 0.27, green: 0.97, blue: 0.38, alpha: 1)
let yellow = NSColor(red: 0.95, green: 0.82, blue: 0.29, alpha: 1)
let red = NSColor(red: 1.0, green: 0.35, blue: 0.30, alpha: 1)

// The scale: segments from left (quiet) to right (loud), 200 deg to -20 deg.
let segments = 22
for i in 0..<segments {
  let from = 200 - CGFloat(i) * 220 / CGFloat(segments)
  let to = from - 220 / CGFloat(segments) + 2.2
  let arc = NSBezierPath()
  arc.appendArc(withCenter: center, radius: radius, startAngle: from, endAngle: to, clockwise: true)
  arc.lineWidth = 64
  let share = CGFloat(i) / CGFloat(segments - 1)
  (share < 0.68 ? green : share < 0.86 ? yellow : red).withAlphaComponent(i < 15 ? 1 : 0.9).setStroke()
  arc.stroke()
}
// darker part after the needle: the level is at about 60 %
for i in 14..<segments {
  let from = 200 - CGFloat(i) * 220 / CGFloat(segments)
  let to = from - 220 / CGFloat(segments) + 2.2
  let arc = NSBezierPath()
  arc.appendArc(withCenter: center, radius: radius, startAngle: from, endAngle: to, clockwise: true)
  arc.lineWidth = 66
  NSColor(white: 0.06, alpha: 0.72).setStroke()
  arc.stroke()
}

// The target mark outside the arc
let targetAngle: CGFloat = 200 - 220 * 0.64
func point(_ angle: CGFloat, _ r: CGFloat) -> CGPoint {
  CGPoint(x: center.x + r * cos(angle * .pi / 180), y: center.y + r * sin(angle * .pi / 180))
}
let mark = NSBezierPath()
mark.move(to: point(targetAngle, radius + 52))
mark.line(to: point(targetAngle, radius + 108))
mark.lineWidth = 22
mark.lineCapStyle = .round
NSColor(white: 0.95, alpha: 1).setStroke()
mark.stroke()

// The needle and its hub
let needleAngle: CGFloat = 200 - 220 * 0.61
let needle = NSBezierPath()
needle.move(to: center)
needle.line(to: point(needleAngle, radius - 40))
needle.lineWidth = 20
needle.lineCapStyle = .round
NSColor(white: 0.92, alpha: 1).setStroke()
needle.stroke()
NSColor(white: 0.22, alpha: 1).setFill()
NSBezierPath(ovalIn: NSRect(x: center.x - 56, y: center.y - 56, width: 112, height: 112)).fill()
green.setFill()
NSBezierPath(ovalIn: NSRect(x: center.x - 26, y: center.y - 26, width: 52, height: 52)).fill()

// "LUFS" below
let style = NSMutableParagraphStyle()
style.alignment = .center
let text = NSAttributedString(string: "LUFS", attributes: [
  .font: NSFont.systemFont(ofSize: 118, weight: .semibold),
  .foregroundColor: NSColor(white: 0.9, alpha: 1),
  .kern: 14,
  .paragraphStyle: style
])
text.draw(in: NSRect(x: 0, y: 190, width: size, height: 150))

image.unlockFocus()
let rep = NSBitmapImageRep(data: image.tiffRepresentation!)!
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
