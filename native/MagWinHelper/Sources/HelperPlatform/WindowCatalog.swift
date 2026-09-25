import AppKit
import CoreGraphics
import HelperCore

public struct RawWindow: Equatable {
    public let id: UInt32
    public let pid: Int32
    public let layer: Int
    public let alpha: Double
    public let frame: Rect
    public let ownerName: String
    /// Only available with Screen Recording permission.
    public let title: String?
    public let isOnScreen: Bool
}

/// Reads the window server list. Frames need no permission; titles need Screen Recording.
public final class WindowCatalog {
    public init() {}

    /// Front-to-back order.
    public func rawWindows(onScreenOnly: Bool) -> [RawWindow] {
        let options: CGWindowListOption =
            onScreenOnly
            ? [.optionOnScreenOnly, .excludeDesktopElements]
            : [.optionAll, .excludeDesktopElements]
        guard let list = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
            return []
        }
        return list.compactMap(WindowCatalog.parse)
    }

    static func parse(_ info: [String: Any]) -> RawWindow? {
        guard
            let id = (info[kCGWindowNumber as String] as? NSNumber)?.uint32Value,
            let pid = (info[kCGWindowOwnerPID as String] as? NSNumber)?.int32Value,
            let boundsDictionary = info[kCGWindowBounds as String] as? NSDictionary,
            let bounds = CGRect(dictionaryRepresentation: boundsDictionary as CFDictionary)
        else { return nil }
        let title = (info[kCGWindowName as String] as? String).flatMap { $0.isEmpty ? nil : $0 }
        return RawWindow(
            id: id,
            pid: pid,
            layer: (info[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 0,
            alpha: (info[kCGWindowAlpha as String] as? NSNumber)?.doubleValue ?? 1,
            frame: Rect(x: bounds.origin.x, y: bounds.origin.y, width: bounds.width, height: bounds.height),
            ownerName: info[kCGWindowOwnerName as String] as? String ?? "",
            title: title,
            isOnScreen: (info[kCGWindowIsOnscreen as String] as? NSNumber)?.boolValue ?? false
        )
    }

    /// Normal-level, visible windows large enough to be real document/app windows.
    public static func isAppWindow(_ window: RawWindow) -> Bool {
        window.layer == 0 && window.alpha > 0.01 && window.frame.width >= 60 && window.frame.height >= 40
    }
}
