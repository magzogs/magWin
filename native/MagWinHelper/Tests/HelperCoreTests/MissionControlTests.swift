import Foundation
import Testing

@testable import HelperCore

private func entry(enabled: Bool, keyCode: Int, modifiers: Int, ascii: Int = 65535) -> [String: Any] {
    [
        "enabled": NSNumber(value: enabled),
        "value": ["parameters": [NSNumber(value: ascii), NSNumber(value: keyCode), NSNumber(value: modifiers)], "type": "standard"],
    ]
}

struct MissionControlHotkeysTests {
    @Test func parsesCustomisedShortcutsLikeTheDevelopmentMac() {
        // Captured from `defaults export com.apple.symbolichotkeys`: ⌥⌘← / ⌥⌘→ and ⌘1 / ⌘2.
        let raw: [String: Any] = [
            "79": entry(enabled: true, keyCode: 123, modifiers: 12_058_624),
            "81": entry(enabled: true, keyCode: 124, modifiers: 12_058_624),
            "118": entry(enabled: true, keyCode: 18, modifiers: 1_048_576, ascii: 49),
            "119": entry(enabled: true, keyCode: 19, modifiers: 1_048_576, ascii: 50),
        ]
        let hotkeys = MissionControlHotkeysParser.parse(raw)
        #expect(hotkeys.moveLeft == HotkeyBinding(keyCode: 123, modifiers: 12_058_624, enabled: true))
        #expect(hotkeys.switchToDesktop[1] == HotkeyBinding(keyCode: 18, modifiers: 1_048_576, enabled: true))
        #expect(hotkeys.switchToDesktop[2]?.enabled == true)
        #expect(hotkeys.switchToDesktop[3] == nil)
    }

    @Test func fallsBackToMacOSDefaults() {
        let hotkeys = MissionControlHotkeysParser.parse(nil)
        #expect(hotkeys.moveLeft == HotkeyBinding(keyCode: 123, modifiers: 0x840000, enabled: true))
        #expect(hotkeys.moveRight?.keyCode == 124)
        #expect(hotkeys.switchToDesktop.isEmpty)
    }

    @Test func honoursDisabledAndUnassignedEntries() {
        let raw: [String: Any] = [
            "79": entry(enabled: false, keyCode: 123, modifiers: 0x840000),
            "81": entry(enabled: true, keyCode: 65535, modifiers: 0),
            "120": ["enabled": NSNumber(value: true)],
        ]
        let hotkeys = MissionControlHotkeysParser.parse(raw)
        #expect(hotkeys.moveLeft?.enabled == false)
        #expect(hotkeys.moveRight?.enabled == false)
        // Entry without a value keeps the default ⌃3 key and the given enabled flag.
        #expect(hotkeys.switchToDesktop[3] == HotkeyBinding(keyCode: 20, modifiers: 0x40000, enabled: true))
    }
}

struct SpaceSwitchPlannerTests {
    let right = HotkeyBinding(keyCode: 124, modifiers: 0x840000, enabled: true)
    let left = HotkeyBinding(keyCode: 123, modifiers: 0x840000, enabled: true)
    let desktopTwo = HotkeyBinding(keyCode: 19, modifiers: 0x40000, enabled: true)

    func location(_ position: Int, number: Int?, display: String = "A") -> SpaceLocation {
        SpaceLocation(displayUuid: display, position: position, desktopNumber: number)
    }

    @Test func doesNothingWhenAlreadyThere() {
        let hotkeys = MissionControlHotkeys(switchToDesktop: [:], moveLeft: left, moveRight: right)
        #expect(SpaceSwitchPlanner.plan(current: location(0, number: 1), target: location(0, number: 1), hotkeys: hotkeys) == .alreadyThere)
    }

    @Test func prefersSwitchToDesktopN() {
        let hotkeys = MissionControlHotkeys(switchToDesktop: [2: desktopTwo], moveLeft: left, moveRight: right)
        #expect(SpaceSwitchPlanner.plan(current: location(0, number: 1), target: location(2, number: 2), hotkeys: hotkeys) == .direct(desktopTwo))
    }

    @Test func walksThroughFullScreenSpacesWithMoveShortcuts() {
        let hotkeys = MissionControlHotkeys(switchToDesktop: [:], moveLeft: left, moveRight: right)
        #expect(SpaceSwitchPlanner.plan(current: location(0, number: 1), target: location(2, number: 2), hotkeys: hotkeys) == .steps(right, count: 2))
        #expect(SpaceSwitchPlanner.plan(current: location(3, number: 3), target: location(1, number: nil), hotkeys: hotkeys) == .steps(left, count: 2))
    }

    @Test func reportsWhenNoShortcutIsUsable() {
        let disabled = HotkeyBinding(keyCode: 124, modifiers: 0, enabled: false)
        let hotkeys = MissionControlHotkeys(switchToDesktop: [:], moveLeft: left, moveRight: disabled)
        guard case .unavailable = SpaceSwitchPlanner.plan(current: location(0, number: 1), target: location(1, number: 2), hotkeys: hotkeys) else {
            Issue.record("expected unavailable")
            return
        }
    }

    @Test func refusesCrossDisplayPlans() {
        let hotkeys = MissionControlHotkeys(switchToDesktop: [:], moveLeft: left, moveRight: right)
        guard case .unavailable = SpaceSwitchPlanner.plan(current: location(0, number: 1), target: location(0, number: 2, display: "B"), hotkeys: hotkeys) else {
            Issue.record("expected unavailable")
            return
        }
    }
}

struct SpaceTopologyParserTests {
    /// Shape of CGSCopyManagedDisplaySpaces on the development Mac (desktop + tiled full-screen space).
    let raw: [[String: Any]] = [
        [
            "Display Identifier": "2084E4AD-2560-4924-82F8-42906FC7BE0A",
            "Current Space": ["ManagedSpaceID": NSNumber(value: 1), "type": NSNumber(value: 0), "uuid": ""],
            "Spaces": [
                ["ManagedSpaceID": NSNumber(value: 1), "type": NSNumber(value: 0), "uuid": ""],
                ["ManagedSpaceID": NSNumber(value: 1135), "type": NSNumber(value: 4), "uuid": "6381B531"],
                ["ManagedSpaceID": NSNumber(value: 1200), "type": NSNumber(value: 0), "uuid": "D2"],
            ],
        ],
        [
            "Display Identifier": "Main",
            "Current Space": ["ManagedSpaceID": NSNumber(value: 1300)],
            "Spaces": [["ManagedSpaceID": NSNumber(value: 1300), "type": NSNumber(value: 0), "uuid": "D3"]],
        ],
    ]

    @Test func parsesDisplaysSpacesAndKinds() {
        let topology = SpaceTopologyParser.parse(raw, mainDisplayUuid: "MAIN-UUID")
        #expect(topology.displays.count == 2)
        let first = topology.displays[0]
        #expect(first.currentSpaceId == 1)
        #expect(first.spaces.map(\.kind) == [.desktop, .fullscreen, .desktop])
        #expect(first.spaces[0].uuid == nil)
        #expect(topology.displays[1].displayUuid == "MAIN-UUID")
    }

    @Test func numbersDesktopsGloballyAndLocatesSpaces() {
        let topology = SpaceTopologyParser.parse(raw, mainDisplayUuid: nil)
        #expect(SpaceTopologyParser.desktopNumber(of: 1200, in: topology) == 2)
        #expect(SpaceTopologyParser.desktopNumber(of: 1300, in: topology) == 3)
        #expect(SpaceTopologyParser.desktopNumber(of: 1135, in: topology) == nil)
        let location = SpaceTopologyParser.location(of: 1200, in: topology)
        #expect(location == SpaceLocation(displayUuid: "2084E4AD-2560-4924-82F8-42906FC7BE0A", position: 2, desktopNumber: 2))
    }
}
