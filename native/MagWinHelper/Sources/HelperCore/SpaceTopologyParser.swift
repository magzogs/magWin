import Foundation

/// Parses the result of the private `CGSCopyManagedDisplaySpaces` call.
public enum SpaceTopologyParser {
    /// - Parameter mainDisplayUuid: replaces the "Main" identifier used when
    ///   "Displays have separate Spaces" is off.
    public static func parse(_ raw: [[String: Any]], mainDisplayUuid: String?) -> TopologyResult {
        TopologyResult(displays: raw.map { display(from: $0, mainDisplayUuid: mainDisplayUuid) })
    }

    static func display(from raw: [String: Any], mainDisplayUuid: String?) -> DisplaySpacesDTO {
        var uuid = raw["Display Identifier"] as? String ?? ""
        if uuid == "Main", let mainDisplayUuid {
            uuid = mainDisplayUuid
        }
        let current = (raw["Current Space"] as? [String: Any]).flatMap(spaceId) ?? 0
        let spaces = (raw["Spaces"] as? [[String: Any]] ?? []).compactMap(space)
        return DisplaySpacesDTO(displayUuid: uuid, currentSpaceId: current, spaces: spaces)
    }

    static func spaceId(_ raw: [String: Any]) -> UInt64? {
        (raw["ManagedSpaceID"] as? NSNumber)?.uint64Value ?? (raw["id64"] as? NSNumber)?.uint64Value
    }

    static func space(_ raw: [String: Any]) -> SpaceDTO? {
        guard let id = spaceId(raw) else { return nil }
        let type = (raw["type"] as? NSNumber)?.intValue ?? 0
        let uuid = (raw["uuid"] as? String).flatMap { $0.isEmpty ? nil : $0 }
        let kind: SpaceKind
        switch type {
        case 0: kind = .desktop
        case 4: kind = .fullscreen
        default: kind = .other
        }
        return SpaceDTO(id: id, uuid: uuid, kind: kind)
    }

    /// Global "Desktop N" number of a space, counting desktops across displays in order.
    public static func desktopNumber(of spaceId: UInt64, in topology: TopologyResult) -> Int? {
        var number = 0
        for display in topology.displays {
            for space in display.spaces where space.kind == .desktop {
                number += 1
                if space.id == spaceId { return number }
            }
        }
        return nil
    }

    /// Location of a space on its display.
    public static func location(of spaceId: UInt64, in topology: TopologyResult) -> SpaceLocation? {
        for display in topology.displays {
            if let position = display.spaces.firstIndex(where: { $0.id == spaceId }) {
                return SpaceLocation(
                    displayUuid: display.displayUuid, position: position,
                    desktopNumber: desktopNumber(of: spaceId, in: topology))
            }
        }
        return nil
    }
}
