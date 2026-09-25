import AppKit
import HelperCore

/// Switches the visible desktop by pressing the user's Mission Control shortcuts, then waits
/// until the window server reports the new space. There is no public API for this.
/// See docs/docs/architecture/decisions/adr-003-keyboard-desktop-switching.md.
public final class SpaceSwitcher {
    private let spaces: SpaceService
    private let hotkeys: HotkeyStore
    private let keyboard: KeyboardPoster
    private let displays: DisplayService
    private let pollInterval: TimeInterval = 0.05
    private let stepTimeout: TimeInterval = 2.5
    /// Lets the switch animation finish so new windows attach to the new desktop.
    private let settleDelay: TimeInterval = 0.35

    public init(spaces: SpaceService, hotkeys: HotkeyStore, keyboard: KeyboardPoster, displays: DisplayService) {
        self.spaces = spaces
        self.hotkeys = hotkeys
        self.keyboard = keyboard
        self.displays = displays
    }

    public func switchTo(spaceId: UInt64) throws -> SwitchSpaceResult {
        let topology = spaces.topology(mainDisplayUuid: displays.mainDisplayUuid())
        guard
            let target = SpaceTopologyParser.location(of: spaceId, in: topology),
            let display = topology.displays.first(where: { $0.displayUuid == target.displayUuid }),
            let current = SpaceTopologyParser.location(of: display.currentSpaceId, in: topology)
        else { throw RPCError("spaceNotFound", "Space \(spaceId) does not exist") }
        let bindings = hotkeys.read()
        switch SpaceSwitchPlanner.plan(current: current, target: target, hotkeys: bindings) {
        case .alreadyThere:
            return SwitchSpaceResult(method: "none", steps: 0)
        case let .direct(binding):
            guard AXIsProcessTrusted() else { throw RPCError.accessibilityDenied }
            keyboard.press(binding)
            if (try? waitUntilCurrent(spaceId, on: target.displayUuid)) != nil {
                return SwitchSpaceResult(method: "direct", steps: 1)
            }
            // The direct shortcut did not work (e.g. taken by another app): walk instead.
            return try walk(to: spaceId, target: target, bindings: bindings)
        case .steps:
            return try walk(to: spaceId, target: target, bindings: bindings)
        case let .unavailable(reason):
            throw RPCError("noShortcut", reason)
        }
    }

    private func walk(to spaceId: UInt64, target: SpaceLocation, bindings: MissionControlHotkeys) throws
        -> SwitchSpaceResult
    {
        guard AXIsProcessTrusted() else { throw RPCError.accessibilityDenied }
        let withoutDirect = MissionControlHotkeys(
            switchToDesktop: [:], moveLeft: bindings.moveLeft, moveRight: bindings.moveRight)
        let topology = spaces.topology(mainDisplayUuid: displays.mainDisplayUuid())
        guard
            let display = topology.displays.first(where: { $0.displayUuid == target.displayUuid }),
            let current = SpaceTopologyParser.location(of: display.currentSpaceId, in: topology)
        else { throw RPCError("spaceNotFound", "Display \(target.displayUuid) disappeared") }
        switch SpaceSwitchPlanner.plan(current: current, target: target, hotkeys: withoutDirect) {
        case .alreadyThere, .direct:
            return SwitchSpaceResult(method: "none", steps: 0)
        case let .unavailable(reason):
            throw RPCError("noShortcut", reason)
        case let .steps(binding, count):
            moveCursor(toDisplay: target.displayUuid)
            for _ in 0..<count {
                let before = currentSpace(on: target.displayUuid)
                keyboard.press(binding)
                try waitUntil { self.currentSpace(on: target.displayUuid) != before }
            }
            try waitUntilCurrent(spaceId, on: target.displayUuid)
            return SwitchSpaceResult(method: "steps", steps: count)
        }
    }

    private func currentSpace(on displayUuid: String) -> UInt64? {
        spaces.topology(mainDisplayUuid: displays.mainDisplayUuid()).displays
            .first { $0.displayUuid == displayUuid }?.currentSpaceId
    }

    private func waitUntilCurrent(_ spaceId: UInt64, on displayUuid: String) throws {
        try waitUntil { self.currentSpace(on: displayUuid) == spaceId }
        Thread.sleep(forTimeInterval: settleDelay)
    }

    private func waitUntil(_ condition: () -> Bool) throws {
        let deadline = Date().addingTimeInterval(stepTimeout)
        while Date() < deadline {
            if condition() { return }
            Thread.sleep(forTimeInterval: pollInterval)
        }
        throw RPCError("switchTimeout", "The desktop did not change in time")
    }

    /// "Move left/right a space" acts on the display under the cursor.
    private func moveCursor(toDisplay uuid: String) {
        let frame = DispatchQueue.main.sync { displays.displays().first { $0.uuid == uuid }?.frame }
        guard let frame else { return }
        let location = CGEvent(source: nil)?.location ?? .zero
        guard !frame.contains(Point(x: location.x, y: location.y)) else { return }
        CGWarpMouseCursorPosition(CGPoint(x: frame.center.x, y: frame.center.y))
        CGAssociateMouseAndMouseCursorPosition(1)
    }
}
