import CoreGraphics
import Foundation
import HelperCore

/// Mission Control spaces through private CGS calls (read only).
public final class SpaceService {
    private let connection = CGSMainConnectionID()

    public init() {}

    public func topology(mainDisplayUuid: String?) -> TopologyResult {
        guard let raw = CGSCopyManagedDisplaySpaces(connection) as? [[String: Any]] else {
            return TopologyResult(displays: [])
        }
        return SpaceTopologyParser.parse(raw, mainDisplayUuid: mainDisplayUuid)
    }

    public func spaces(forWindow id: UInt32) -> [UInt64] {
        let ids = [NSNumber(value: id)] as CFArray
        guard let spaces = CGSCopySpacesForWindows(connection, SpaceMask.all, ids) as? [NSNumber] else {
            return []
        }
        return spaces.map(\.uint64Value)
    }
}
