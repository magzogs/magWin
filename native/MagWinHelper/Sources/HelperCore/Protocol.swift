import Foundation

/// Wire contract with the Electron main process. Keep in sync with
/// apps/desktop/src/main/infrastructure/helper/protocol.ts and
/// docs/docs/architecture/helper-protocol.md.
public enum HelperProtocol {
    public static let version = 1
}

public struct RPCError: Error, Equatable, Codable, Sendable {
    public let code: String
    public let message: String

    public init(_ code: String, _ message: String) {
        self.code = code
        self.message = message
    }

    public static func badRequest(_ message: String) -> RPCError { RPCError("badRequest", message) }
    public static let accessibilityDenied = RPCError(
        "accessibilityDenied", "Accessibility permission is required")
}

public struct Empty: Codable, Equatable, Sendable {
    public init() {}
}

public struct HelloResult: Codable, Equatable, Sendable {
    public let protocolVersion: Int
    public let pid: Int32
    public let accessibility: Bool

    public init(protocolVersion: Int, pid: Int32, accessibility: Bool) {
        self.protocolVersion = protocolVersion
        self.pid = pid
        self.accessibility = accessibility
    }
}

public struct PermissionStatus: Codable, Equatable, Sendable {
    public let accessibility: Bool
    public let screenRecording: Bool

    public init(accessibility: Bool, screenRecording: Bool) {
        self.accessibility = accessibility
        self.screenRecording = screenRecording
    }
}

public struct DisplayDTO: Codable, Equatable, Sendable {
    public let id: UInt32
    public let uuid: String
    public let name: String
    public let frame: Rect
    public let visibleFrame: Rect
    public let isMain: Bool

    public init(id: UInt32, uuid: String, name: String, frame: Rect, visibleFrame: Rect, isMain: Bool) {
        self.id = id
        self.uuid = uuid
        self.name = name
        self.frame = frame
        self.visibleFrame = visibleFrame
        self.isMain = isMain
    }
}

public struct DisplaysResult: Codable, Equatable, Sendable {
    public let displays: [DisplayDTO]
    public init(displays: [DisplayDTO]) { self.displays = displays }
}

public enum SpaceKind: String, Codable, Sendable {
    case desktop, fullscreen, other
}

public struct SpaceDTO: Codable, Equatable, Sendable {
    public let id: UInt64
    public let uuid: String?
    public let kind: SpaceKind

    public init(id: UInt64, uuid: String?, kind: SpaceKind) {
        self.id = id
        self.uuid = uuid
        self.kind = kind
    }
}

public struct DisplaySpacesDTO: Codable, Equatable, Sendable {
    public let displayUuid: String
    public let currentSpaceId: UInt64
    public let spaces: [SpaceDTO]

    public init(displayUuid: String, currentSpaceId: UInt64, spaces: [SpaceDTO]) {
        self.displayUuid = displayUuid
        self.currentSpaceId = currentSpaceId
        self.spaces = spaces
    }
}

public struct TopologyResult: Codable, Equatable, Sendable {
    public let displays: [DisplaySpacesDTO]
    public init(displays: [DisplaySpacesDTO]) { self.displays = displays }
}

public struct SwitchSpaceParams: Codable, Equatable, Sendable {
    public let spaceId: UInt64
}

public struct SwitchSpaceResult: Codable, Equatable, Sendable {
    /// "none" (already there), "direct" (Switch to Desktop N) or "steps" (move left/right).
    public let method: String
    public let steps: Int

    public init(method: String, steps: Int) {
        self.method = method
        self.steps = steps
    }
}

public struct DesktopHotkeyDTO: Codable, Equatable, Sendable {
    public let number: Int
    public let binding: HotkeyBinding
}

public struct HotkeyStatusResult: Codable, Equatable, Sendable {
    public let switchToDesktop: [DesktopHotkeyDTO]
    public let moveLeft: HotkeyBinding?
    public let moveRight: HotkeyBinding?

    public init(hotkeys: MissionControlHotkeys) {
        switchToDesktop = hotkeys.switchToDesktop.keys.sorted().compactMap { number in
            hotkeys.switchToDesktop[number].map { DesktopHotkeyDTO(number: number, binding: $0) }
        }
        moveLeft = hotkeys.moveLeft
        moveRight = hotkeys.moveRight
    }
}

public enum WindowScope: String, Codable, Sendable {
    case current, all
}

public struct ListWindowsParams: Codable, Equatable, Sendable {
    public let scope: WindowScope
}

public struct WindowDTO: Codable, Equatable, Sendable {
    public let id: UInt32
    public let pid: Int32
    public let bundleId: String?
    public let appName: String
    public let title: String?
    public let frame: Rect
    public let isOnScreen: Bool
    public let spaceIds: [UInt64]

    public init(
        id: UInt32, pid: Int32, bundleId: String?, appName: String, title: String?, frame: Rect,
        isOnScreen: Bool, spaceIds: [UInt64]
    ) {
        self.id = id
        self.pid = pid
        self.bundleId = bundleId
        self.appName = appName
        self.title = title
        self.frame = frame
        self.isOnScreen = isOnScreen
        self.spaceIds = spaceIds
    }
}

public struct WindowsResult: Codable, Equatable, Sendable {
    public let windows: [WindowDTO]
    public init(windows: [WindowDTO]) { self.windows = windows }
}

public struct WindowRefParams: Codable, Equatable, Sendable {
    public let windowId: UInt32
    public let pid: Int32
}

public struct SetFrameParams: Codable, Equatable, Sendable {
    public let windowId: UInt32
    public let pid: Int32
    public let frame: Rect
}

public struct FrameResult: Codable, Equatable, Sendable {
    public let frame: Rect
    public init(frame: Rect) { self.frame = frame }
}

public struct AppDTO: Codable, Equatable, Sendable {
    public let pid: Int32
    public let bundleId: String?
    public let name: String
    public let path: String?
    /// Hidden with ⌘H; its windows are not part of the visible layout.
    public let isHidden: Bool

    public init(pid: Int32, bundleId: String?, name: String, path: String?, isHidden: Bool) {
        self.pid = pid
        self.bundleId = bundleId
        self.name = name
        self.path = path
        self.isHidden = isHidden
    }
}

public struct AppsResult: Codable, Equatable, Sendable {
    public let apps: [AppDTO]
    public init(apps: [AppDTO]) { self.apps = apps }
}

public struct LaunchParams: Codable, Equatable, Sendable {
    public let bundleId: String?
    public let path: String?
}

public struct LaunchResult: Codable, Equatable, Sendable {
    public let pid: Int32
    public init(pid: Int32) { self.pid = pid }
}

public enum Edge: String, Codable, CaseIterable, Sendable {
    case top, bottom, left, right
}

public enum ModifierRequirement: String, Codable, Sendable {
    case none, option, control, command, shift
}

public struct EdgeConfig: Codable, Equatable, Sendable {
    public var enabled: Bool
    public var edges: [Edge]
    public var dwellMs: Int
    public var bandPx: Double
    public var modifier: ModifierRequirement

    public init(enabled: Bool, edges: [Edge], dwellMs: Int, bandPx: Double, modifier: ModifierRequirement) {
        self.enabled = enabled
        self.edges = edges
        self.dwellMs = dwellMs
        self.bandPx = bandPx
        self.modifier = modifier
    }

    /// Disabled until the main process sends the user's settings.
    public static let initial = EdgeConfig(
        enabled: false, edges: Edge.allCases, dwellMs: 350, bandPx: 5, modifier: .none)
}

public struct PausedParams: Codable, Equatable, Sendable {
    public let paused: Bool
}

public struct EdgeHoverEvent: Codable, Equatable, Sendable {
    public let windowId: UInt32
    public let pid: Int32
    public let bundleId: String?
    public let appName: String
    public let frame: Rect
    public let edge: Edge
    public let point: Point

    public init(
        windowId: UInt32, pid: Int32, bundleId: String?, appName: String, frame: Rect, edge: Edge,
        point: Point
    ) {
        self.windowId = windowId
        self.pid = pid
        self.bundleId = bundleId
        self.appName = appName
        self.frame = frame
        self.edge = edge
        self.point = point
    }
}

public struct EdgeBlockedEvent: Codable, Equatable, Sendable {
    public let reason: String
    public init(reason: String) { self.reason = reason }
}

public struct LogEvent: Codable, Equatable, Sendable {
    public let level: String
    public let message: String
    public init(level: String, message: String) {
        self.level = level
        self.message = message
    }
}
