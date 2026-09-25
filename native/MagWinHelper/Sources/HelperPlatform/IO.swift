import Foundation
import HelperCore

/// Serialised writes of JSON lines to stdout.
public final class OutputChannel {
    private let queue = DispatchQueue(label: "magwin.helper.output")
    private let handle = FileHandle.standardOutput

    public init() {}

    public func write(_ line: Data) {
        queue.async {
            self.handle.write(line)
            self.handle.write(Data([0x0A]))
        }
    }

    public func event<D: Encodable>(_ name: String, _ data: D) {
        if let line = Router.event(name, data: data) {
            write(line)
        }
    }

    public func flush() {
        queue.sync {}
    }
}

/// Reads JSON-lines requests from stdin on a background thread and answers them in order.
public final class InputReader {
    private let router: Router
    private let output: OutputChannel
    private let queue: DispatchQueue

    public init(router: Router, output: OutputChannel, queue: DispatchQueue) {
        self.router = router
        self.output = output
        self.queue = queue
    }

    /// `onEnd` runs after stdin closes (the parent quit) and pending requests finished.
    public func start(onEnd: @escaping () -> Void) {
        let router = router
        let output = output
        let queue = queue
        let thread = Thread {
            var buffer = LineBuffer()
            while true {
                let chunk = FileHandle.standardInput.availableData
                if chunk.isEmpty { break }
                for line in buffer.append(chunk) {
                    queue.async { output.write(router.handle(line: line)) }
                }
            }
            queue.sync {}
            output.flush()
            onEnd()
        }
        thread.start()
    }
}
