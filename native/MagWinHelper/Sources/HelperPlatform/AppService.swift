import AppKit
import HelperCore

/// Running applications and launching them.
public final class AppService {
    private let launchTimeout: TimeInterval

    public init(launchTimeout: TimeInterval = 20) {
        self.launchTimeout = launchTimeout
    }

    /// Regular (Dock) applications keyed by pid.
    public func regularApplications() -> [Int32: NSRunningApplication] {
        var result: [Int32: NSRunningApplication] = [:]
        for app in NSWorkspace.shared.runningApplications where app.activationPolicy == .regular {
            result[app.processIdentifier] = app
        }
        return result
    }

    public func running() -> [AppDTO] {
        regularApplications().values
            .sorted { $0.processIdentifier < $1.processIdentifier }
            .map {
                AppDTO(
                    pid: $0.processIdentifier,
                    bundleId: $0.bundleIdentifier,
                    name: $0.localizedName ?? $0.bundleIdentifier ?? "App",
                    path: $0.bundleURL?.path,
                    isHidden: $0.isHidden)
            }
    }

    /// Launches the app (or re-opens it when running). New windows appear on the current desktop.
    public func launch(bundleId: String?, path: String?) throws -> LaunchResult {
        guard let url = resolveURL(bundleId: bundleId, path: path) else {
            throw RPCError("appNotFound", "Application \(bundleId ?? path ?? "?") is not installed")
        }
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = true
        let semaphore = DispatchSemaphore(value: 0)
        var launched: NSRunningApplication?
        var failure: Error?
        NSWorkspace.shared.openApplication(at: url, configuration: configuration) { app, error in
            launched = app
            failure = error
            semaphore.signal()
        }
        guard semaphore.wait(timeout: .now() + launchTimeout) == .success else {
            throw RPCError("launchFailed", "Timed out launching \(url.lastPathComponent)")
        }
        if let failure {
            throw RPCError("launchFailed", failure.localizedDescription)
        }
        guard let launched else {
            throw RPCError("launchFailed", "\(url.lastPathComponent) did not start")
        }
        return LaunchResult(pid: launched.processIdentifier)
    }

    private func resolveURL(bundleId: String?, path: String?) -> URL? {
        if let bundleId, let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) {
            return url
        }
        if let path, FileManager.default.fileExists(atPath: path) {
            return URL(fileURLWithPath: path)
        }
        return nil
    }
}

public enum Permissions {
    public static func status() -> PermissionStatus {
        PermissionStatus(accessibility: AXIsProcessTrusted(), screenRecording: CGPreflightScreenCaptureAccess())
    }

    /// Shows the system prompt that sends the user to System Settings › Accessibility.
    public static func requestAccessibility() -> PermissionStatus {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        let trusted = AXIsProcessTrustedWithOptions([key: true] as CFDictionary)
        return PermissionStatus(accessibility: trusted, screenRecording: CGPreflightScreenCaptureAccess())
    }
}
