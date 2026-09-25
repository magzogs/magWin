import Testing

@testable import HelperCore

struct DwellTrackerTests {
    let frame = Rect(x: 0, y: 0, width: 500, height: 400)
    var top: EdgeHit { EdgeHit(windowId: 1, pid: 1, edge: .top, frame: frame) }
    var left: EdgeHit { EdgeHit(windowId: 1, pid: 1, edge: .left, frame: frame) }
    let point = Point(x: 100, y: 0)

    @Test func firesAfterTheDwellTime() {
        var tracker = DwellTracker(dwell: 0.3)
        #expect(tracker.observe(hit: top, point: point, now: 0, gate: .open) == nil)
        #expect(tracker.deadline == 0.3)
        #expect(tracker.observe(hit: top, point: point, now: 0.2, gate: .open) == nil)
        let fire = tracker.observe(hit: top, point: Point(x: 120, y: 0), now: 0.31, gate: .open)
        #expect(fire?.hit == top)
        #expect(fire?.point == Point(x: 120, y: 0))
    }

    @Test func firesOnlyOncePerVisit() {
        var tracker = DwellTracker(dwell: 0.3)
        _ = tracker.observe(hit: top, point: point, now: 0, gate: .open)
        _ = tracker.observe(hit: top, point: point, now: 0.4, gate: .open)
        #expect(tracker.observe(hit: top, point: point, now: 5, gate: .open) == nil)
        // Leaving and coming back arms it again.
        #expect(tracker.observe(hit: nil, point: point, now: 6, gate: .open) == nil)
        #expect(tracker.observe(hit: top, point: point, now: 7, gate: .open) == nil)
        #expect(tracker.observe(hit: top, point: point, now: 7.31, gate: .open) != nil)
    }

    @Test func restartsWhenTheTargetChanges() {
        var tracker = DwellTracker(dwell: 0.3)
        _ = tracker.observe(hit: top, point: point, now: 0, gate: .open)
        #expect(tracker.observe(hit: left, point: point, now: 0.25, gate: .open) == nil)
        #expect(tracker.observe(hit: left, point: point, now: 0.4, gate: .open) == nil)
        #expect(tracker.observe(hit: left, point: point, now: 0.56, gate: .open)?.hit == left)
    }

    @Test func pressedButtonsDisarmUntilTheCursorLeaves() {
        var tracker = DwellTracker(dwell: 0.3)
        // Resizing by dragging the edge, then releasing on it.
        _ = tracker.observe(hit: top, point: point, now: 0, gate: .suppress)
        #expect(tracker.observe(hit: top, point: point, now: 1, gate: .open) == nil)
        #expect(tracker.observe(hit: top, point: point, now: 2, gate: .open) == nil)
        _ = tracker.observe(hit: nil, point: point, now: 3, gate: .open)
        _ = tracker.observe(hit: top, point: point, now: 4, gate: .open)
        #expect(tracker.observe(hit: top, point: point, now: 4.31, gate: .open) != nil)
    }

    @Test func missingModifierWaitsWithoutDisarming() {
        var tracker = DwellTracker(dwell: 0.3)
        #expect(tracker.observe(hit: top, point: point, now: 0, gate: .hold) == nil)
        #expect(tracker.state == .idle)
        _ = tracker.observe(hit: top, point: point, now: 1, gate: .open)
        #expect(tracker.observe(hit: top, point: point, now: 1.31, gate: .open) != nil)
    }

    @Test func zeroDwellFiresImmediately() {
        var tracker = DwellTracker(dwell: 0)
        #expect(tracker.observe(hit: top, point: point, now: 0, gate: .open)?.hit == top)
    }
}
