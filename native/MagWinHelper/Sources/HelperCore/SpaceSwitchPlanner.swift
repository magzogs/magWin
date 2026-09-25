import Foundation

/// Where a space sits: its display and its position among all of that display's spaces
/// (full-screen spaces included, because "move left/right a space" walks through them).
public struct SpaceLocation: Equatable, Sendable {
    public let displayUuid: String
    public let position: Int
    /// Global "Desktop N" number; nil for full-screen spaces.
    public let desktopNumber: Int?

    public init(displayUuid: String, position: Int, desktopNumber: Int?) {
        self.displayUuid = displayUuid
        self.position = position
        self.desktopNumber = desktopNumber
    }
}

public enum SwitchPlan: Equatable, Sendable {
    case alreadyThere
    /// One press of "Switch to Desktop N".
    case direct(HotkeyBinding)
    /// `count` presses of "move left/right a space" on the target display.
    case steps(HotkeyBinding, count: Int)
    case unavailable(String)
}

/// Chooses the keyboard shortcut strategy for reaching a desktop.
/// See docs/docs/architecture/decisions/adr-003-keyboard-desktop-switching.md.
public enum SpaceSwitchPlanner {
    /// - Parameter current: the current space of the target's display.
    public static func plan(current: SpaceLocation, target: SpaceLocation, hotkeys: MissionControlHotkeys)
        -> SwitchPlan
    {
        guard current.displayUuid == target.displayUuid else {
            return .unavailable("current and target spaces are on different displays")
        }
        if current.position == target.position {
            return .alreadyThere
        }
        if let number = target.desktopNumber, let direct = hotkeys.switchToDesktop[number], direct.enabled {
            return .direct(direct)
        }
        let delta = target.position - current.position
        let step = delta > 0 ? hotkeys.moveRight : hotkeys.moveLeft
        guard let step, step.enabled else {
            return .unavailable(
                "Enable \"Switch to Desktop N\" or \"Move left/right a space\" in Keyboard Shortcuts › Mission Control")
        }
        return .steps(step, count: abs(delta))
    }
}
