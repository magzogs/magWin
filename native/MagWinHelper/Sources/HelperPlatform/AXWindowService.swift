import AppKit
import ApplicationServices
import HelperCore

/// Reads and moves other apps' windows through the Accessibility API.
public final class AXWindowService {
    private let timeout: Float

    public init(timeout: Float = 0.75) {
        self.timeout = timeout
    }

    public var isTrusted: Bool { AXIsProcessTrusted() }

    /// Titles of the app's windows that Accessibility can see (windows on the current desktops).
    public func titles(pid: Int32) -> [UInt32: String] {
        var result: [UInt32: String] = [:]
        for window in windows(of: application(pid)) {
            guard let id = windowId(of: window), let title = attribute(window, kAXTitleAttribute) as? String,
                !title.isEmpty
            else { continue }
            result[id] = title
        }
        return result
    }

    /// True when the window can be both moved and resized and is not full screen.
    public func isSnappable(pid: Int32, windowId: UInt32) -> Bool {
        guard let window = window(pid: pid, windowId: windowId) else { return false }
        return !isFullScreen(window) && isSettable(window, kAXSizeAttribute)
            && isSettable(window, kAXPositionAttribute)
    }

    /// Size → position → size: the second size fixes apps that clamp while still on the old display.
    public func setFrame(pid: Int32, windowId: UInt32, frame: Rect) throws -> Rect {
        guard isTrusted else { throw RPCError.accessibilityDenied }
        let app = application(pid)
        let window = try requireWindow(in: app, pid: pid, windowId: windowId)
        guard !isFullScreen(window) else {
            throw RPCError("fullscreen", "Full-screen windows cannot be moved")
        }
        guard isSettable(window, kAXSizeAttribute) || isSettable(window, kAXPositionAttribute) else {
            throw RPCError("notResizable", "The window cannot be moved or resized")
        }
        let restoreEnhancedUI = disableEnhancedUserInterface(app)
        defer {
            if restoreEnhancedUI { setEnhancedUserInterface(app, enabled: true) }
        }
        let size = CGSize(width: frame.width, height: frame.height)
        _ = set(window, size: size)
        _ = set(window, position: CGPoint(x: frame.x, y: frame.y))
        _ = set(window, size: size)
        return self.frame(of: window) ?? frame
    }

    public func focus(pid: Int32, windowId: UInt32) throws {
        guard isTrusted else { throw RPCError.accessibilityDenied }
        let app = application(pid)
        let window = try requireWindow(in: app, pid: pid, windowId: windowId)
        AXUIElementSetAttributeValue(app, kAXFrontmostAttribute as CFString, kCFBooleanTrue)
        AXUIElementSetAttributeValue(window, kAXMainAttribute as CFString, kCFBooleanTrue)
        AXUIElementPerformAction(window, kAXRaiseAction as CFString)
    }

    // MARK: - Elements

    func application(_ pid: Int32) -> AXUIElement {
        let element = AXUIElementCreateApplication(pid)
        AXUIElementSetMessagingTimeout(element, timeout)
        return element
    }

    func windows(of app: AXUIElement) -> [AXUIElement] {
        (attribute(app, kAXWindowsAttribute) as? [AXUIElement]) ?? []
    }

    func windowId(of window: AXUIElement) -> UInt32? {
        var id: CGWindowID = 0
        return _AXUIElementGetWindow(window, &id) == .success ? id : nil
    }

    func window(pid: Int32, windowId: UInt32) -> AXUIElement? {
        windows(of: application(pid)).first { self.windowId(of: $0) == windowId }
    }

    func requireWindow(in app: AXUIElement, pid: Int32, windowId: UInt32) throws -> AXUIElement {
        guard let window = windows(of: app).first(where: { self.windowId(of: $0) == windowId }) else {
            throw RPCError("windowNotFound", "Window \(windowId) of process \(pid) is not accessible")
        }
        return window
    }

    // MARK: - Attributes

    func attribute(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, name as CFString, &value) == .success else { return nil }
        return value
    }

    func isSettable(_ element: AXUIElement, _ name: String) -> Bool {
        var settable = DarwinBoolean(false)
        let status = AXUIElementIsAttributeSettable(element, name as CFString, &settable)
        return status == .success && settable.boolValue
    }

    func isFullScreen(_ window: AXUIElement) -> Bool {
        (attribute(window, "AXFullScreen") as? NSNumber)?.boolValue ?? false
    }

    func frame(of window: AXUIElement) -> Rect? {
        var position = CGPoint.zero
        var size = CGSize.zero
        guard
            let positionValue = axValue(attribute(window, kAXPositionAttribute)),
            let sizeValue = axValue(attribute(window, kAXSizeAttribute)),
            AXValueGetValue(positionValue, .cgPoint, &position),
            AXValueGetValue(sizeValue, .cgSize, &size)
        else { return nil }
        return Rect(x: position.x, y: position.y, width: size.width, height: size.height)
    }

    func axValue(_ value: CFTypeRef?) -> AXValue? {
        guard let value, CFGetTypeID(value) == AXValueGetTypeID() else { return nil }
        return unsafeBitCast(value, to: AXValue.self)
    }

    func set(_ window: AXUIElement, position: CGPoint) -> Bool {
        var point = position
        guard let value = AXValueCreate(.cgPoint, &point) else { return false }
        return AXUIElementSetAttributeValue(window, kAXPositionAttribute as CFString, value) == .success
    }

    func set(_ window: AXUIElement, size: CGSize) -> Bool {
        var dimensions = size
        guard let value = AXValueCreate(.cgSize, &dimensions) else { return false }
        return AXUIElementSetAttributeValue(window, kAXSizeAttribute as CFString, value) == .success
    }

    /// Chromium-based apps animate Accessibility-driven moves while this attribute is on.
    func disableEnhancedUserInterface(_ app: AXUIElement) -> Bool {
        guard (attribute(app, "AXEnhancedUserInterface") as? NSNumber)?.boolValue == true else { return false }
        setEnhancedUserInterface(app, enabled: false)
        return true
    }

    func setEnhancedUserInterface(_ app: AXUIElement, enabled: Bool) {
        AXUIElementSetAttributeValue(
            app, "AXEnhancedUserInterface" as CFString, enabled ? kCFBooleanTrue : kCFBooleanFalse)
    }
}
