import Foundation

/// An on-screen application window considered for edge hovering.
public struct WindowCandidate: Equatable, Sendable {
    public let id: UInt32
    public let pid: Int32
    public let frame: Rect

    public init(id: UInt32, pid: Int32, frame: Rect) {
        self.id = id
        self.pid = pid
        self.frame = frame
    }
}

public struct EdgeHit: Equatable, Sendable {
    public let windowId: UInt32
    public let pid: Int32
    public let edge: Edge
    public let frame: Rect

    public init(windowId: UInt32, pid: Int32, edge: Edge, frame: Rect) {
        self.windowId = windowId
        self.pid = pid
        self.edge = edge
        self.frame = frame
    }

    public func sameTarget(as other: EdgeHit) -> Bool {
        windowId == other.windowId && edge == other.edge
    }
}

/// A display's full frame and its visible frame (minus menu bar and a shown Dock).
public struct ScreenArea: Equatable, Sendable {
    public let frame: Rect
    public let visibleFrame: Rect

    public init(frame: Rect, visibleFrame: Rect) {
        self.frame = frame
        self.visibleFrame = visibleFrame
    }
}

/// Pure hit testing. See docs/docs/architecture/edge-detection.md.
public enum EdgeDetector {
    /// - Parameters:
    ///   - windows: candidate windows ordered front to back.
    ///   - screens: displays; points outside every visible frame never trigger.
    ///   - dockSide: the screen side the Dock lives on (`top` never happens).
    ///   - band: half width of the trigger band around each edge line.
    public static func hit(
        at point: Point, windows: [WindowCandidate], screens: [ScreenArea], dockSide: Edge?,
        band: Double, edges: Set<Edge>
    ) -> EdgeHit? {
        guard let screen = screens.first(where: { $0.visibleFrame.contains(point) }) else { return nil }
        // The front-most window whose band contains the point decides; windows behind it are covered.
        guard let window = windows.first(where: { $0.frame.insetBy(-band).contains(point) }) else {
            return nil
        }
        guard let hit = classify(point: point, window: window, band: band, edges: edges) else { return nil }
        if let dockSide, hit.edge == dockSide,
            touchesDock(point: point, window: window.frame, screen: screen, screens: screens, side: dockSide, band: band)
        {
            return nil
        }
        return hit
    }

    /// How close a window edge may sit to the Dock's screen edge before it stops triggering:
    /// the trigger band plus the strip that reveals an auto-hidden Dock.
    public static func dockClearance(band: Double) -> Double { band + 8 }

    /// A window edge lying against the Dock's screen edge overlaps the Dock (an auto-hidden one
    /// slides up over it), so hovering there would raise the Dock and the palette together.
    static func touchesDock(
        point: Point, window: Rect, screen: ScreenArea, screens: [ScreenArea], side: Edge, band: Double
    ) -> Bool {
        let frame = screen.frame
        let gap: Double
        let beyond: Point
        switch side {
        case .bottom:
            gap = frame.maxY - window.maxY
            beyond = Point(x: point.x, y: frame.maxY + 1)
        case .left:
            gap = window.minX - frame.minX
            beyond = Point(x: frame.minX - 1, y: point.y)
        case .right:
            gap = frame.maxX - window.maxX
            beyond = Point(x: frame.maxX + 1, y: point.y)
        case .top:
            return false
        }
        // The Dock only appears on an outer screen edge; another display beyond it means no Dock here.
        let outer = !screens.contains(where: { $0.frame.contains(beyond) })
        return outer && gap <= dockClearance(band: band)
    }

    /// Corners are the diagonal resize handles, so they never trigger.
    public static func cornerSize(band: Double) -> Double { max(band * 3, 16) }

    static func classify(point: Point, window: WindowCandidate, band: Double, edges: Set<Edge>)
        -> EdgeHit?
    {
        let frame = window.frame
        let distances: [(Edge, Double)] = [
            (.top, abs(point.y - frame.minY)),
            (.bottom, abs(point.y - frame.maxY)),
            (.left, abs(point.x - frame.minX)),
            (.right, abs(point.x - frame.maxX)),
        ]
        guard let nearest = distances.filter({ $0.1 <= band }).min(by: { $0.1 < $1.1 }) else {
            return nil
        }
        let corner = cornerSize(band: band)
        let inCorner: Bool
        switch nearest.0 {
        case .top, .bottom:
            inCorner = point.x - frame.minX < corner || frame.maxX - point.x < corner
        case .left, .right:
            inCorner = point.y - frame.minY < corner || frame.maxY - point.y < corner
        }
        guard !inCorner, edges.contains(nearest.0) else { return nil }
        return EdgeHit(windowId: window.id, pid: window.pid, edge: nearest.0, frame: frame)
    }
}
