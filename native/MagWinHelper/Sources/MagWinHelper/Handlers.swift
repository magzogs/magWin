import AppKit
import HelperCore
import HelperPlatform

/// Registers every RPC method. See docs/docs/architecture/helper-protocol.md.
enum Handlers {
    static func register(on router: Router, services: HelperServices, watcher: EdgeWatcher) {
        registerSystem(on: router, services: services)
        registerWindows(on: router, services: services)
        registerEdge(on: router, watcher: watcher)
    }

    private static func registerSystem(on router: Router, services: HelperServices) {
        router.register("hello") { (_: Empty) in
            HelloResult(protocolVersion: HelperProtocol.version, pid: getpid(), accessibility: AXIsProcessTrusted())
        }
        router.register("permissions.status") { (_: Empty) in Permissions.status() }
        router.register("permissions.requestAccessibility") { (_: Empty) in
            DispatchQueue.main.sync { Permissions.requestAccessibility() }
        }
        router.register("displays.list") { (_: Empty) in
            DisplaysResult(displays: DispatchQueue.main.sync { services.displays.displays() })
        }
        router.register("spaces.topology") { (_: Empty) in
            services.spaces.topology(mainDisplayUuid: services.displays.mainDisplayUuid())
        }
        router.register("spaces.switch") { (params: SwitchSpaceParams) in
            try services.switcher.switchTo(spaceId: params.spaceId)
        }
        router.register("hotkeys.status") { (_: Empty) in
            HotkeyStatusResult(hotkeys: services.hotkeys.read())
        }
        router.register("apps.list") { (_: Empty) in AppsResult(apps: services.apps.running()) }
        router.register("apps.launch") { (params: LaunchParams) in
            try services.apps.launch(bundleId: params.bundleId, path: params.path)
        }
    }

    private static func registerWindows(on router: Router, services: HelperServices) {
        router.register("windows.list") { (params: ListWindowsParams) in
            services.windowLister.list(scope: params.scope)
        }
        router.register("windows.setFrame") { (params: SetFrameParams) in
            FrameResult(frame: try services.ax.setFrame(pid: params.pid, windowId: params.windowId, frame: params.frame))
        }
        router.register("windows.focus") { (params: WindowRefParams) -> Empty in
            try services.ax.focus(pid: params.pid, windowId: params.windowId)
            return Empty()
        }
    }

    private static func registerEdge(on router: Router, watcher: EdgeWatcher) {
        router.register("edge.configure") { (params: EdgeConfig) -> Empty in
            DispatchQueue.main.async { watcher.configure(params) }
            return Empty()
        }
        router.register("edge.setPaused") { (params: PausedParams) -> Empty in
            DispatchQueue.main.async { watcher.setPaused(params.paused) }
            return Empty()
        }
    }
}
