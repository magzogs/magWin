import AppKit
import HelperCore

/// Turns a dwell fire into an `edge.hover` event after checking the window can be snapped.
public final class EdgeHoverPublisher {
    private let ax: AXWindowService
    private let output: OutputChannel
    private var lastBlockedAt: TimeInterval = -.infinity
    private let blockedInterval: TimeInterval = 30

    public init(ax: AXWindowService, output: OutputChannel) {
        self.ax = ax
        self.output = output
    }

    /// Call from a background queue: Accessibility calls may block for a moment.
    public func publish(_ fire: DwellFire) {
        guard ax.isTrusted else {
            reportBlocked()
            return
        }
        let hit = fire.hit
        guard ax.isSnappable(pid: hit.pid, windowId: hit.windowId) else { return }
        let app = NSRunningApplication(processIdentifier: hit.pid)
        output.event(
            "edge.hover",
            EdgeHoverEvent(
                windowId: hit.windowId,
                pid: hit.pid,
                bundleId: app?.bundleIdentifier,
                appName: app?.localizedName ?? "App",
                frame: hit.frame,
                edge: hit.edge,
                point: fire.point))
    }

    private func reportBlocked() {
        let now = ProcessInfo.processInfo.systemUptime
        guard now - lastBlockedAt > blockedInterval else { return }
        lastBlockedAt = now
        output.event("edge.blocked", EdgeBlockedEvent(reason: "accessibility"))
    }
}

/// Every platform service the helper exposes, built once.
public final class HelperServices {
    public let catalog = WindowCatalog()
    public let spaces = SpaceService()
    public let ax = AXWindowService()
    public let apps = AppService()
    public let displays = DisplayService()
    public let hotkeys = HotkeyStore()
    public let keyboard = KeyboardPoster()
    public let switcher: SpaceSwitcher
    public let windowLister: WindowLister

    public init(ignoredPids: Set<Int32>) {
        switcher = SpaceSwitcher(spaces: spaces, hotkeys: hotkeys, keyboard: keyboard, displays: displays)
        windowLister = WindowLister(
            catalog: catalog, spaces: spaces, ax: ax, apps: apps, ignoredPids: ignoredPids)
    }
}
