import AppKit
import HelperCore
import HelperPlatform

// Composition root of the helper. The Electron main process spawns this binary and talks
// JSON lines over stdin/stdout. The helper exits when stdin closes.

let application = NSApplication.shared
application.setActivationPolicy(.accessory)

let output = OutputChannel()
let rpcQueue = DispatchQueue(label: "magwin.helper.rpc")
let edgeQueue = DispatchQueue(label: "magwin.helper.edge")
// Never treat OrgaWin's own windows (palette, HUDs) as snap targets.
let ignoredPids: Set<Int32> = [getpid(), getppid()]

let services = HelperServices(ignoredPids: ignoredPids)
let publisher = EdgeHoverPublisher(ax: services.ax, output: output)
let watcher = EdgeWatcher(catalog: services.catalog, displays: services.displays, ignoredPids: ignoredPids) { fire in
    edgeQueue.async { publisher.publish(fire) }
}

let router = Router()
Handlers.register(on: router, services: services, watcher: watcher)

watcher.start()
InputReader(router: router, output: output, queue: rpcQueue).start {
    exit(0)
}
output.event("log", LogEvent(level: "info", message: "helper ready (protocol \(HelperProtocol.version))"))
application.run()
