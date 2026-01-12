//
//  BundleLoader.swift
//  GraniteScreen
//
//  Protocol for abstracting bundle loading strategies
//

import Foundation

// MARK: - BundleLoader Protocol

/// Protocol that abstracts bundle loading strategies
/// Matches Android's BundleLoader interface for cross-platform consistency
public protocol BundleLoadable {
    /// Loads a bundle and returns its source configuration
    func loadBundle() async throws -> BundleSource
    static func evaluate(scriptData: Data,
                                url: String,
                                bridgeProxy: Any) async throws
}

// MARK: - BundleSource

/// Represents the source of a JavaScript bundle
/// Matches Android's sealed class BundleSource
public enum BundleSource {
    /// Development server bundle
    case devServer(host: String = "localhost", port: Int = 8081, moduleName: String, forBundleRoot: String)

    /// Production bundle from various locations
    case production(location: ProductionLocation, moduleName: String)

    case customPath(URL, moduleName: String)
}


/// Represents the location of a production bundle
public enum ProductionLocation {
    /// Bundle from file system
    case fileSystemBundle(filePath: URL)

    /// Bundle from app's main bundle
    case embeddedBundle
}

// MARK: - Bundle Loading Error

/// Errors that can occur during bundle loading
public enum BundleLoadError: LocalizedError {
    case networkError(Error)
    case fileNotFound(String)
    case invalidURL(String)
    case downloadFailed(String)
    case metroServerUnavailable
    case bundleNotReady

    public var errorDescription: String? {
        switch self {
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .fileNotFound(let path):
            return "Bundle file not found at: \(path)"
        case .invalidURL(let url):
            return "Invalid bundle URL: \(url)"
        case .downloadFailed(let reason):
            return "Bundle download failed: \(reason)"
        case .metroServerUnavailable:
            return "Metro server is not available"
        case .bundleNotReady:
            return "Bundle is not ready for loading"
        }
    }
}

public extension BundleLoadable {
    public static func evaluate(scriptData: Data,
                                url: String,
                                bridgeProxy: Any) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            BundleEvaluator.evaluate(scriptData,
                                     url: url,
                                     bridgeProxy: bridgeProxy) { nsError in
                if let error = nsError {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }
}
