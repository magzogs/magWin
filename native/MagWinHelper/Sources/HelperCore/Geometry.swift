import Foundation

/// A point in global Quartz coordinates (origin top-left of the main display, y grows down).
public struct Point: Codable, Equatable, Sendable {
    public var x: Double
    public var y: Double

    public init(x: Double, y: Double) {
        self.x = x
        self.y = y
    }
}

/// A rectangle in global Quartz coordinates.
public struct Rect: Codable, Equatable, Sendable {
    public var x: Double
    public var y: Double
    public var width: Double
    public var height: Double

    public init(x: Double, y: Double, width: Double, height: Double) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    }

    public var minX: Double { x }
    public var maxX: Double { x + width }
    public var minY: Double { y }
    public var maxY: Double { y + height }
    public var center: Point { Point(x: x + width / 2, y: y + height / 2) }

    /// Inclusive on every edge.
    public func contains(_ point: Point) -> Bool {
        point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
    }

    /// Positive values shrink, negative values grow.
    public func insetBy(_ amount: Double) -> Rect {
        Rect(x: x + amount, y: y + amount, width: width - amount * 2, height: height - amount * 2)
    }
}

/// AppKit uses a bottom-left origin; Quartz, Accessibility and Electron use top-left.
public enum CoordinateSpace {
    public static func quartzRect(fromCocoa rect: Rect, primaryDisplayHeight: Double) -> Rect {
        Rect(x: rect.x, y: primaryDisplayHeight - rect.y - rect.height, width: rect.width, height: rect.height)
    }

    public static func quartzPoint(fromCocoa point: Point, primaryDisplayHeight: Double) -> Point {
        Point(x: point.x, y: primaryDisplayHeight - point.y)
    }
}
