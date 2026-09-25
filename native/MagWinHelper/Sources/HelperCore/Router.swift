import Foundation

private struct RequestHeader: Decodable {
    let id: Int
    let method: String
}

/// Decodes `params`, treating a missing value as `{}` so parameterless methods need no payload.
private struct ParamsEnvelope<P: Decodable>: Decodable {
    let params: P

    private enum CodingKeys: String, CodingKey {
        case params
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        if let params = try container.decodeIfPresent(P.self, forKey: .params) {
            self.params = params
        } else {
            self.params = try JSONDecoder().decode(P.self, from: Data("{}".utf8))
        }
    }
}

private struct SuccessEnvelope<R: Encodable>: Encodable {
    let id: Int
    let ok = true
    let result: R
}

private struct FailureEnvelope: Encodable {
    let id: Int
    let ok = false
    let error: RPCError
}

private struct EventEnvelope<D: Encodable>: Encodable {
    let event: String
    let data: D
}

/// Method registry. New RPC methods are added by registering a handler, never by editing
/// the dispatch code (open/closed).
public final class Router {
    public typealias Handler = (_ id: Int, _ line: Data) throws -> Data

    private var handlers: [String: Handler] = [:]

    public init() {}

    public var methods: [String] { handlers.keys.sorted() }

    public func register<P: Decodable, R: Encodable>(
        _ method: String, _ body: @escaping (P) throws -> R
    ) {
        handlers[method] = { id, line in
            let params: P
            do {
                params = try JSONDecoder().decode(ParamsEnvelope<P>.self, from: line).params
            } catch {
                throw RPCError.badRequest("Invalid params for \(method): \(error)")
            }
            return try JSONEncoder().encode(SuccessEnvelope(id: id, result: try body(params)))
        }
    }

    /// Handles one request line and returns the response line (without the trailing newline).
    public func handle(line: Data) -> Data {
        guard let header = try? JSONDecoder().decode(RequestHeader.self, from: line) else {
            return Router.failure(id: -1, error: .badRequest("Malformed request"))
        }
        guard let handler = handlers[header.method] else {
            return Router.failure(
                id: header.id, error: RPCError("unknownMethod", "Unknown method \(header.method)"))
        }
        do {
            return try handler(header.id, line)
        } catch let error as RPCError {
            return Router.failure(id: header.id, error: error)
        } catch {
            return Router.failure(id: header.id, error: RPCError("internal", "\(error)"))
        }
    }

    public static func failure(id: Int, error: RPCError) -> Data {
        (try? JSONEncoder().encode(FailureEnvelope(id: id, error: error)))
            ?? Data(#"{"id":-1,"ok":false,"error":{"code":"internal","message":"encode"}}"#.utf8)
    }

    public static func event<D: Encodable>(_ name: String, data: D) -> Data? {
        try? JSONEncoder().encode(EventEnvelope(event: name, data: data))
    }
}
