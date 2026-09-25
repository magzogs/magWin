import ApplicationServices
import CoreGraphics

// Private SkyLight/CoreGraphics and HIServices symbols. They are read-only uses that
// window managers (AltTab, Rectangle, Hammerspoon) rely on; verify them on every macOS release.
// See docs/docs/architecture/layout-restore.md.

typealias CGSConnectionID = Int32

@_silgen_name("CGSMainConnectionID")
func CGSMainConnectionID() -> CGSConnectionID

/// Returns one dictionary per display with "Display Identifier", "Current Space" and "Spaces".
@_silgen_name("CGSCopyManagedDisplaySpaces")
func CGSCopyManagedDisplaySpaces(_ connection: CGSConnectionID) -> CFArray?

/// Returns the space ids containing the given windows.
@_silgen_name("CGSCopySpacesForWindows")
func CGSCopySpacesForWindows(_ connection: CGSConnectionID, _ mask: Int32, _ windowIds: CFArray) -> CFArray?

/// Maps an Accessibility window element to its window server id.
@_silgen_name("_AXUIElementGetWindow")
func _AXUIElementGetWindow(_ element: AXUIElement, _ windowId: UnsafeMutablePointer<CGWindowID>) -> AXError

enum SpaceMask {
    /// Current, other and user spaces.
    static let all: Int32 = 0x7
}
