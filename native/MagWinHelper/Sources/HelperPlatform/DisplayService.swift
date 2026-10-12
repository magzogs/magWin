import AppKit
import HelperCore

/// Displays in Quartz coordinates. `displays()` must run on the main thread (NSScreen).
public final class DisplayService {
    public init() {}

    public func displays() -> [DisplayDTO] {
        let screens = NSScreen.screens
        guard let primaryHeight = screens.first?.frame.height else { return [] }
        return screens.compactMap { dto(for: $0, primaryHeight: primaryHeight) }
    }

    /// The screen side the Dock is pinned to (System Settings › Desktop & Dock › Position).
    public func dockSide() -> Edge {
        let domain = "com.apple.dock" as CFString
        CFPreferencesAppSynchronize(domain)
        switch CFPreferencesCopyAppValue("orientation" as CFString, domain) as? String {
        case "left": return .left
        case "right": return .right
        default: return .bottom
        }
    }

    public func mainDisplayUuid() -> String? {
        DisplayService.uuid(for: CGMainDisplayID())
    }

    public static func uuid(for id: CGDirectDisplayID) -> String? {
        guard let unmanaged = CGDisplayCreateUUIDFromDisplayID(id) else { return nil }
        return CFUUIDCreateString(nil, unmanaged.takeRetainedValue()) as String
    }

    private func dto(for screen: NSScreen, primaryHeight: CGFloat) -> DisplayDTO? {
        let key = NSDeviceDescriptionKey("NSScreenNumber")
        guard let number = screen.deviceDescription[key] as? NSNumber else { return nil }
        let id = CGDirectDisplayID(number.uint32Value)
        return DisplayDTO(
            id: id,
            uuid: DisplayService.uuid(for: id) ?? String(id),
            name: screen.localizedName,
            frame: quartz(screen.frame, primaryHeight),
            visibleFrame: quartz(screen.visibleFrame, primaryHeight),
            isMain: CGDisplayIsMain(id) != 0
        )
    }

    private func quartz(_ rect: CGRect, _ primaryHeight: CGFloat) -> Rect {
        CoordinateSpace.quartzRect(
            fromCocoa: Rect(x: rect.origin.x, y: rect.origin.y, width: rect.width, height: rect.height),
            primaryDisplayHeight: primaryHeight)
    }
}
