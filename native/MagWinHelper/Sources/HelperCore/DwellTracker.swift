import Foundation

/// Why the tracker may not arm right now.
public enum DwellGate: Equatable, Sendable {
    /// Free to arm and fire.
    case open
    /// Required modifier is not held: wait, but fire as soon as it is pressed.
    case hold
    /// Mouse button down or palette showing: forget the current edge until the cursor leaves it,
    /// so finishing a resize drag on an edge never pops the palette.
    case suppress
}

public struct DwellFire: Equatable, Sendable {
    public let hit: EdgeHit
    public let point: Point
}

/// Fires once when the cursor rests on the same window edge for `dwell` seconds.
/// See docs/docs/architecture/edge-detection.md.
public struct DwellTracker: Sendable {
    public enum State: Equatable, Sendable {
        case idle
        case pending(EdgeHit, since: TimeInterval)
        case fired(EdgeHit)
        case disarmed(EdgeHit?)
    }

    public private(set) var state: State = .idle
    public var dwell: TimeInterval

    public init(dwell: TimeInterval) {
        self.dwell = dwell
    }

    /// When the pending target should be re-checked even without mouse movement.
    public var deadline: TimeInterval? {
        if case let .pending(_, since) = state { return since + dwell }
        return nil
    }

    public mutating func reset() {
        state = .idle
    }

    public mutating func observe(hit: EdgeHit?, point: Point, now: TimeInterval, gate: DwellGate)
        -> DwellFire?
    {
        switch state {
        case let .disarmed(previous):
            if let hit, let previous, hit.sameTarget(as: previous) {
                return nil
            }
            if gate == .suppress {
                state = .disarmed(hit)
                return nil
            }
            state = .idle
            return observe(hit: hit, point: point, now: now, gate: gate)
        case let .fired(target):
            if let hit, hit.sameTarget(as: target) {
                return nil
            }
            state = .idle
            return observe(hit: hit, point: point, now: now, gate: gate)
        case let .pending(target, since):
            return observePending(target: target, since: since, hit: hit, point: point, now: now, gate: gate)
        case .idle:
            return observeIdle(hit: hit, point: point, now: now, gate: gate)
        }
    }

    private mutating func observeIdle(hit: EdgeHit?, point: Point, now: TimeInterval, gate: DwellGate)
        -> DwellFire?
    {
        guard let hit else { return nil }
        switch gate {
        case .suppress:
            state = .disarmed(hit)
            return nil
        case .hold:
            return nil
        case .open:
            state = .pending(hit, since: now)
            return dwell <= 0 ? fire(hit, point) : nil
        }
    }

    private mutating func observePending(
        target: EdgeHit, since: TimeInterval, hit: EdgeHit?, point: Point, now: TimeInterval,
        gate: DwellGate
    ) -> DwellFire? {
        switch gate {
        case .suppress:
            state = .disarmed(hit)
            return nil
        case .hold:
            state = .idle
            return nil
        case .open:
            break
        }
        guard let hit else {
            state = .idle
            return nil
        }
        guard hit.sameTarget(as: target) else {
            state = .pending(hit, since: now)
            return nil
        }
        return now - since >= dwell ? fire(hit, point) : nil
    }

    private mutating func fire(_ hit: EdgeHit, _ point: Point) -> DwellFire {
        state = .fired(hit)
        return DwellFire(hit: hit, point: point)
    }
}
