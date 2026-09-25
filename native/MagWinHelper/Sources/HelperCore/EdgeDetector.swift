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

/// Pure hit testing. See docs/docs/architecture/edge-detection.md.
public enum EdgeDetector {
    /// - Parameters:
    ///   - windows: candidate windows ordered front to back.
    ///   - visibleFrames: display frames minus menu bar and Dock; points outside never trigger.
    ///   - band: half width of the trigger band around each edge line.
    public static func hit(
        at point: Point, windows: [WindowCandidate], visibleFrames: [Rect], band: Double,
        edges: Set<Edge>
    ) -> EdgeHit? {
        guard visibleFrames.contains(where: { $0.contains(point) }) else { return nil }
        // The front-most window whose band contains the point decides; windows behind it are covered.
        guard let window = windows.first(where: { $0.frame.insetBy(-band).contains(point) }) else {
            return nil
        }
        return classify(point: point, window: window, band: band, edges: edges)
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
