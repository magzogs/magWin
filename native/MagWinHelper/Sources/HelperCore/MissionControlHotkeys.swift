import Foundation

/// A system keyboard shortcut. `modifiers` uses NSEvent/CGEventFlags bit values, which are identical.
public struct HotkeyBinding: Codable, Equatable, Sendable {
    public let keyCode: UInt16
    public let modifiers: UInt64
    public let enabled: Bool

    public init(keyCode: UInt16, modifiers: UInt64, enabled: Bool) {
        self.keyCode = keyCode
        self.modifiers = modifiers
        self.enabled = enabled
    }
}

/// Mission Control shortcuts as configured in System Settings › Keyboard › Keyboard Shortcuts.
public struct MissionControlHotkeys: Equatable, Sendable {
    /// Desktop number → "Switch to Desktop N". Absent entries are disabled.
    public var switchToDesktop: [Int: HotkeyBinding]
    public var moveLeft: HotkeyBinding?
    public var moveRight: HotkeyBinding?

    public init(switchToDesktop: [Int: HotkeyBinding], moveLeft: HotkeyBinding?, moveRight: HotkeyBinding?) {
        self.switchToDesktop = switchToDesktop
        self.moveLeft = moveLeft
        self.moveRight = moveRight
    }
}

/// Parses `AppleSymbolicHotKeys` from the `com.apple.symbolichotkeys` preferences domain.
/// IDs: 79 = move left a space, 81 = move right a space, 118 + (N - 1) = switch to Desktop N.
public enum MissionControlHotkeysParser {
    public static let moveLeftId = 79
    public static let moveRightId = 81
    public static let firstDesktopId = 118
    public static let maxDesktops = 16

    static let control: UInt64 = 0x40000
    static let function: UInt64 = 0x800000
    /// macOS defaults: ⌃← / ⌃→ enabled, "Switch to Desktop N" (⌃N) disabled.
    static let defaultMoveLeft = HotkeyBinding(keyCode: 123, modifiers: control | function, enabled: true)
    static let defaultMoveRight = HotkeyBinding(keyCode: 124, modifiers: control | function, enabled: true)
    static let digitKeyCodes: [Int: UInt16] = [
        1: 18, 2: 19, 3: 20, 4: 21, 5: 23, 6: 22, 7: 26, 8: 28, 9: 25, 10: 29,
    ]

    public static func parse(_ symbolicHotkeys: [String: Any]?) -> MissionControlHotkeys {
        let entries = symbolicHotkeys ?? [:]
        var desktops: [Int: HotkeyBinding] = [:]
        for number in 1...maxDesktops {
            let fallback = digitKeyCodes[number].map {
                HotkeyBinding(keyCode: $0, modifiers: control, enabled: false)
            }
            if let binding = binding(entries[String(firstDesktopId + number - 1)], fallback: fallback) {
                desktops[number] = binding
            }
        }
        return MissionControlHotkeys(
            switchToDesktop: desktops,
            moveLeft: binding(entries[String(moveLeftId)], fallback: defaultMoveLeft) ?? defaultMoveLeft,
            moveRight: binding(entries[String(moveRightId)], fallback: defaultMoveRight) ?? defaultMoveRight
        )
    }

    /// nil when the entry is absent (the caller decides the default).
    static func binding(_ entry: Any?, fallback: HotkeyBinding?) -> HotkeyBinding? {
        guard let dictionary = entry as? [String: Any] else { return nil }
        let enabled = (dictionary["enabled"] as? NSNumber)?.boolValue ?? false
        guard
            let value = dictionary["value"] as? [String: Any],
            let parameters = value["parameters"] as? [Any],
            parameters.count >= 3,
            let keyCode = (parameters[1] as? NSNumber)?.intValue,
            let modifiers = (parameters[2] as? NSNumber)?.uint64Value
        else {
            return fallback.map { HotkeyBinding(keyCode: $0.keyCode, modifiers: $0.modifiers, enabled: enabled) }
        }
        // 65535 means "no key assigned".
        guard keyCode != 0xFFFF else {
            return HotkeyBinding(keyCode: 0, modifiers: 0, enabled: false)
        }
        return HotkeyBinding(keyCode: UInt16(keyCode), modifiers: modifiers, enabled: enabled)
    }
}
