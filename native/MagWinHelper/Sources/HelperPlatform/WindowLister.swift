import AppKit
import HelperCore

/// Builds the `windows.list` answer: app windows with titles and the spaces that contain them.
public final class WindowLister {
    private let catalog: WindowCatalog
    private let spaces: SpaceService
    private let ax: AXWindowService
    private let apps: AppService
    private let ignoredPids: Set<Int32>

    public init(
        catalog: WindowCatalog, spaces: SpaceService, ax: AXWindowService, apps: AppService,
        ignoredPids: Set<Int32>
    ) {
        self.catalog = catalog
        self.spaces = spaces
        self.ax = ax
        self.apps = apps
        self.ignoredPids = ignoredPids
    }

    public func list(scope: WindowScope) -> WindowsResult {
        let regular = apps.regularApplications()
        let raws = catalog.rawWindows(onScreenOnly: scope == .current).filter {
            WindowCatalog.isAppWindow($0) && regular[$0.pid] != nil && !ignoredPids.contains($0.pid)
        }
        var titlesByPid: [Int32: [UInt32: String]] = [:]
        if ax.isTrusted {
            for pid in Set(raws.map(\.pid)) {
                titlesByPid[pid] = ax.titles(pid: pid)
            }
        }
        let windows = raws.compactMap { raw -> WindowDTO? in
            let spaceIds = spaces.spaces(forWindow: raw.id)
            // Off-screen helper windows belong to no space; minimized windows are skipped too.
            if scope == .all && spaceIds.isEmpty { return nil }
            let app = regular[raw.pid]
            return WindowDTO(
                id: raw.id,
                pid: raw.pid,
                bundleId: app?.bundleIdentifier,
                appName: app?.localizedName ?? raw.ownerName,
                title: raw.title ?? titlesByPid[raw.pid]?[raw.id],
                frame: raw.frame,
                isOnScreen: raw.isOnScreen,
                spaceIds: spaceIds)
        }
        return WindowsResult(windows: windows)
    }
}
