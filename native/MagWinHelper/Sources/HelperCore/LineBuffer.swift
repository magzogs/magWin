import Foundation

/// Splits a byte stream into newline-terminated lines (JSON Lines framing).
public struct LineBuffer {
    private var pending = Data()

    public init() {}

    /// Appends a chunk and returns every complete, non-empty line it finished.
    public mutating func append(_ chunk: Data) -> [Data] {
        pending.append(chunk)
        var lines: [Data] = []
        while let newline = pending.firstIndex(of: 0x0A) {
            var line = Data(pending[pending.startIndex..<newline])
            pending = Data(pending[pending.index(after: newline)...])
            if line.last == 0x0D {
                line.removeLast()
            }
            if !line.isEmpty {
                lines.append(line)
            }
        }
        return lines
    }
}
