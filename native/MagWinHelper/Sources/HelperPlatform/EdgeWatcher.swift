import AppKit
import HelperCore

/// Watches the global cursor and reports when it rests on another app's window edge.
/// Lives on the main thread (NSEvent monitors and NSScreen).
public final class EdgeWatcher {
    public typealias FireHandler = (DwellFire) -> Void

    private let catalog: WindowCatalog
    private let displays: DisplayService
    private let ignoredPids: Set<Int32>
    private let onFire: FireHandler
    private var config = EdgeConfig.initial
    private var paused = false
    private var tracker = DwellTracker(dwell: 0.35)
    private var monitor: Any?
    private var visibleFrames: [Rect] = []
    private var cachedWindows: [WindowCandidate] = []
    private var cacheTime: TimeInterval = 0
    private var dwellCheck: DispatchWorkItem?
    /// Window frames rarely change while hovering; re-reading the list is the costly part.
    private let cacheLifetime: TimeInterval = 0.15

    public init(catalog: WindowCatalog, displays: DisplayService, ignoredPids: Set<Int32>, onFire: @escaping FireHandler) {
        self.catalog = catalog
        self.displays = displays
        self.ignoredPids = ignoredPids
        self.onFire = onFire
    }

    public func start() {
        refreshScreens()
        NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main
        ) { [weak self] _ in
            self?.refreshScreens()
        }
        let mask: NSEvent.EventTypeMask = [
            .mouseMoved, .leftMouseDown, .leftMouseUp, .leftMouseDragged, .rightMouseDown, .rightMouseUp,
            .otherMouseDown, .otherMouseUp, .flagsChanged,
        ]
        monitor = NSEvent.addGlobalMonitorForEvents(matching: mask) { [weak self] event in
            self?.handle(event)
        }
    }

    public func configure(_ config: EdgeConfig) {
        self.config = config
        tracker.dwell = Double(config.dwellMs) / 1000
        tracker.reset()
        evaluate()
    }

    public func setPaused(_ paused: Bool) {
        self.paused = paused
        evaluate()
    }

    private func handle(_ event: NSEvent) {
        switch event.type {
        case .leftMouseUp, .rightMouseUp, .otherMouseUp:
            cacheTime = 0  // a drag may have moved or resized windows
        default:
            break
        }
        evaluate()
    }

    private func evaluate() {
        guard config.enabled else {
            tracker.reset()
            cancelDwellCheck()
            return
        }
        let now = ProcessInfo.processInfo.systemUptime
        let location = CGEvent(source: nil)?.location ?? .zero
        let point = Point(x: location.x, y: location.y)
        let hit = EdgeDetector.hit(
            at: point, windows: candidates(now: now), visibleFrames: visibleFrames, band: config.bandPx,
            edges: Set(config.edges))
        if let fire = tracker.observe(hit: hit, point: point, now: now, gate: gate()) {
            onFire(fire)
        }
        scheduleDwellCheck(now: now)
    }

    private func gate() -> DwellGate {
        if paused || NSEvent.pressedMouseButtons != 0 { return .suppress }
        return modifierHeld() ? .open : .hold
    }

    private func modifierHeld() -> Bool {
        let flags = NSEvent.modifierFlags
        switch config.modifier {
        case .none: return true
        case .option: return flags.contains(.option)
        case .control: return flags.contains(.control)
        case .command: return flags.contains(.command)
        case .shift: return flags.contains(.shift)
        }
    }

    private func candidates(now: TimeInterval) -> [WindowCandidate] {
        guard now - cacheTime > cacheLifetime else { return cachedWindows }
        var regular: [Int32: Bool] = [:]
        cachedWindows = catalog.rawWindows(onScreenOnly: true)
            .filter { WindowCatalog.isAppWindow($0) && !ignoredPids.contains($0.pid) }
            .filter { raw in
                if let known = regular[raw.pid] { return known }
                let isRegular = NSRunningApplication(processIdentifier: raw.pid)?.activationPolicy == .regular
                regular[raw.pid] = isRegular
                return isRegular
            }
            .map { WindowCandidate(id: $0.id, pid: $0.pid, frame: $0.frame) }
        cacheTime = now
        return cachedWindows
    }

    /// Re-evaluates at the dwell deadline even when the mouse stops moving.
    private func scheduleDwellCheck(now: TimeInterval) {
        cancelDwellCheck()
        guard let deadline = tracker.deadline else { return }
        let item = DispatchWorkItem { [weak self] in self?.evaluate() }
        dwellCheck = item
        DispatchQueue.main.asyncAfter(deadline: .now() + max(0, deadline - now) + 0.01, execute: item)
    }

    private func cancelDwellCheck() {
        dwellCheck?.cancel()
        dwellCheck = nil
    }

    private func refreshScreens() {
        visibleFrames = displays.displays().map(\.visibleFrame)
        cacheTime = 0
    }
}
