// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MagWinHelper",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "MagWinHelper", targets: ["MagWinHelper"]),
    ],
    targets: [
        // Pure logic: protocol, geometry, edge detection, dwell state machine, hotkey parsing.
        .target(name: "HelperCore"),
        // Thin adapters over AppKit, Accessibility, CoreGraphics and private CGS calls.
        .target(
            name: "HelperPlatform",
            dependencies: ["HelperCore"],
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("ApplicationServices"),
                .linkedFramework("CoreGraphics"),
            ]
        ),
        // Composition root: JSON-lines RPC over stdin/stdout.
        .executableTarget(name: "MagWinHelper", dependencies: ["HelperCore", "HelperPlatform"]),
        .testTarget(name: "HelperCoreTests", dependencies: ["HelperCore"]),
    ],
    swiftLanguageModes: [.v5]
)
