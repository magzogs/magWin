import Foundation
import Testing

@testable import HelperCore

struct LineBufferTests {
    @Test func splitsLinesAcrossChunksAndDropsBlankLines() {
        var buffer = LineBuffer()
        #expect(buffer.append(Data("{\"a\":1}\n{\"b\"".utf8)) == [Data("{\"a\":1}".utf8)])
        #expect(buffer.append(Data(":2}\r\n\n".utf8)) == [Data("{\"b\":2}".utf8)])
        #expect(buffer.append(Data("tail".utf8)).isEmpty)
    }
}

struct GeometryTests {
    @Test func convertsCocoaToQuartz() {
        let cocoa = Rect(x: 0, y: 0, width: 1440, height: 875)
        #expect(CoordinateSpace.quartzRect(fromCocoa: cocoa, primaryDisplayHeight: 900) == Rect(x: 0, y: 25, width: 1440, height: 875))
        #expect(CoordinateSpace.quartzPoint(fromCocoa: Point(x: 10, y: 900), primaryDisplayHeight: 900) == Point(x: 10, y: 0))
    }

    @Test func insetsAndContains() {
        let rect = Rect(x: 10, y: 10, width: 100, height: 50)
        #expect(rect.insetBy(-5) == Rect(x: 5, y: 5, width: 110, height: 60))
        #expect(rect.contains(Point(x: 110, y: 60)))
        #expect(!rect.contains(Point(x: 111, y: 60)))
    }
}

private struct EchoParams: Codable {
    let text: String
}

private func json(_ data: Data) -> [String: Any] {
    (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
}

struct RouterTests {
    func makeRouter() -> Router {
        let router = Router()
        router.register("echo") { (params: EchoParams) in params }
        router.register("ping") { (_: Empty) in HelloResult(protocolVersion: 1, pid: 42, accessibility: false) }
        router.register("fail") { (_: Empty) -> Empty in throw RPCError("windowNotFound", "gone") }
        return router
    }

    @Test func answersWithTheRequestId() {
        let response = json(makeRouter().handle(line: Data(#"{"id":7,"method":"echo","params":{"text":"hi"}}"#.utf8)))
        #expect(response["id"] as? Int == 7)
        #expect(response["ok"] as? Bool == true)
        #expect((response["result"] as? [String: Any])?["text"] as? String == "hi")
    }

    @Test func treatsMissingParamsAsEmpty() {
        let response = json(makeRouter().handle(line: Data(#"{"id":1,"method":"ping"}"#.utf8)))
        #expect((response["result"] as? [String: Any])?["pid"] as? Int == 42)
    }

    @Test func reportsErrorsWithCodes() {
        let router = makeRouter()
        let unknown = json(router.handle(line: Data(#"{"id":2,"method":"nope"}"#.utf8)))
        #expect((unknown["error"] as? [String: Any])?["code"] as? String == "unknownMethod")
        let bad = json(router.handle(line: Data(#"{"id":3,"method":"echo","params":{"x":1}}"#.utf8)))
        #expect((bad["error"] as? [String: Any])?["code"] as? String == "badRequest")
        let thrown = json(router.handle(line: Data(#"{"id":4,"method":"fail"}"#.utf8)))
        #expect((thrown["error"] as? [String: Any])?["code"] as? String == "windowNotFound")
        #expect(thrown["ok"] as? Bool == false)
        let malformed = json(router.handle(line: Data("not json".utf8)))
        #expect(malformed["id"] as? Int == -1)
    }

    @Test func encodesEvents() {
        let line = Router.event("edge.blocked", data: EdgeBlockedEvent(reason: "accessibility"))
        let event = json(line ?? Data())
        #expect(event["event"] as? String == "edge.blocked")
        #expect((event["data"] as? [String: Any])?["reason"] as? String == "accessibility")
    }
}
