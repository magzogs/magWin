import CoreGraphics
import Foundation
import HelperCore

/// Reads the user's Mission Control shortcuts so OrgaWin presses exactly what the user configured.
public final class HotkeyStore {
    public init() {}

    public func read() -> MissionControlHotkeys {
        let domain = "com.apple.symbolichotkeys" as CFString
        CFPreferencesAppSynchronize(domain)
        let value = CFPreferencesCopyAppValue("AppleSymbolicHotKeys" as CFString, domain) as? [String: Any]
        return MissionControlHotkeysParser.parse(value)
    }
}

/// Posts synthetic key presses at the HID level (needs Accessibility permission).
public final class KeyboardPoster {
    public init() {}

    public func press(_ binding: HotkeyBinding) {
        let source = CGEventSource(stateID: .hidSystemState)
        let flags = CGEventFlags(rawValue: binding.modifiers & 0xFFFF_0000)
        for isDown in [true, false] {
            guard
                let event = CGEvent(
                    keyboardEventSource: source, virtualKey: CGKeyCode(binding.keyCode), keyDown: isDown)
            else { continue }
            event.flags = flags
            event.post(tap: .cghidEventTap)
            usleep(12_000)
        }
    }
}
