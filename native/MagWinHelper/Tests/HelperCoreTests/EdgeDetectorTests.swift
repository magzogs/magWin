import Testing

@testable import HelperCore

struct EdgeDetectorTests {
    let screen = [ScreenArea(frame: Rect(x: 0, y: 0, width: 1440, height: 900), visibleFrame: Rect(x: 0, y: 25, width: 1440, height: 875))]
    let front = WindowCandidate(id: 1, pid: 10, frame: Rect(x: 100, y: 100, width: 600, height: 400))
    let back = WindowCandidate(id: 2, pid: 20, frame: Rect(x: 400, y: 300, width: 600, height: 400))
    let allEdges = Set(Edge.allCases)

    func hit(_ x: Double, _ y: Double, edges: Set<Edge>? = nil) -> EdgeHit? {
        EdgeDetector.hit(
            at: Point(x: x, y: y), windows: [front, back], screens: screen, dockSide: .bottom, band: 5, edges: edges ?? allEdges)
    }

    @Test func detectsEveryEdgeWithinTheBand() {
        #expect(hit(300, 97)?.edge == .top)
        #expect(hit(300, 104)?.edge == .top)
        #expect(hit(300, 500)?.edge == .bottom)
        #expect(hit(100, 250)?.edge == .left)
        #expect(hit(703, 250)?.edge == .right)
        #expect(hit(300, 97)?.windowId == 1)
    }

    @Test func ignoresPointsInsideOrFarOutside() {
        #expect(hit(300, 200) == nil)
        #expect(hit(300, 80) == nil)
    }

    @Test func skipsCornersBecauseTheyAreDiagonalResizeHandles() {
        #expect(hit(105, 100) == nil)
        #expect(hit(698, 102) == nil)
        #expect(hit(100, 110) == nil)
    }

    @Test func frontWindowCoversEdgesBehindIt() {
        // Back window's top edge (y = 300) runs under the front window here.
        #expect(hit(500, 300) == nil)
        // Outside the front window the back window's edge is exposed.
        #expect(hit(800, 300)?.windowId == 2)
    }

    @Test func respectsDisabledEdges() {
        #expect(hit(300, 100, edges: [.left, .right]) == nil)
        #expect(hit(100, 250, edges: [.left])?.edge == .left)
    }

    @Test func neverTriggersOutsideTheVisibleFrame() {
        let underMenuBar = WindowCandidate(id: 3, pid: 30, frame: Rect(x: 0, y: 25, width: 1440, height: 875))
        let result = EdgeDetector.hit(
            at: Point(x: 700, y: 22), windows: [underMenuBar], screens: screen, dockSide: .bottom, band: 5, edges: allEdges)
        #expect(result == nil)
        let inside = EdgeDetector.hit(
            at: Point(x: 700, y: 27), windows: [underMenuBar], screens: screen, dockSide: .bottom, band: 5, edges: allEdges)
        #expect(inside?.edge == .top)
    }

    // Auto-hidden Dock at the bottom: the visible frame stops 4 px above the screen bottom.
    let hiddenDock = ScreenArea(
        frame: Rect(x: 0, y: 0, width: 1440, height: 900), visibleFrame: Rect(x: 0, y: 25, width: 1440, height: 871))
    let tall = WindowCandidate(id: 4, pid: 40, frame: Rect(x: 0, y: 25, width: 1440, height: 871))

    func dockHit(_ x: Double, _ y: Double, dock: Edge?, screens: [ScreenArea]? = nil) -> EdgeHit? {
        EdgeDetector.hit(
            at: Point(x: x, y: y), windows: [tall], screens: screens ?? [hiddenDock], dockSide: dock, band: 5,
            edges: allEdges)
    }

    @Test func edgeAgainstTheDockNeverTriggers() {
        #expect(dockHit(700, 894, dock: .bottom) == nil)
        #expect(dockHit(700, 894, dock: nil)?.edge == .bottom)
        // Other edges of the same window still work.
        #expect(dockHit(2, 400, dock: .bottom)?.edge == .left)
    }

    @Test func followsTheDockPosition() {
        #expect(dockHit(2, 400, dock: .left) == nil)
        #expect(dockHit(1438, 400, dock: .right) == nil)
        #expect(dockHit(700, 894, dock: .left)?.edge == .bottom)
    }

    @Test func edgeClearOfTheDockStillTriggers() {
        // A shown Dock: the window ends at the visible frame, 70 px above the screen bottom.
        let shown = ScreenArea(
            frame: Rect(x: 0, y: 0, width: 1440, height: 900), visibleFrame: Rect(x: 0, y: 25, width: 1440, height: 805))
        let window = WindowCandidate(id: 5, pid: 50, frame: Rect(x: 100, y: 25, width: 800, height: 805))
        let result = EdgeDetector.hit(
            at: Point(x: 500, y: 828), windows: [window], screens: [shown], dockSide: .bottom, band: 5, edges: allEdges)
        #expect(result?.edge == .bottom)
    }

    @Test func innerScreenEdgeHasNoDock() {
        // A second display sits below this one, so the Dock cannot appear on this bottom edge.
        let below = ScreenArea(
            frame: Rect(x: 0, y: 900, width: 1440, height: 900), visibleFrame: Rect(x: 0, y: 900, width: 1440, height: 900))
        let upper = ScreenArea(
            frame: Rect(x: 0, y: 0, width: 1440, height: 900), visibleFrame: Rect(x: 0, y: 25, width: 1440, height: 875))
        let window = WindowCandidate(id: 6, pid: 60, frame: Rect(x: 0, y: 25, width: 1440, height: 873))
        let result = EdgeDetector.hit(
            at: Point(x: 700, y: 897), windows: [window], screens: [upper, below], dockSide: .bottom, band: 5,
            edges: allEdges)
        #expect(result?.edge == .bottom)
    }
}
