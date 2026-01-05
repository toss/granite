//
//  NaverMapRegistry.swift
//  granite-naver-map
//
//  Registry singleton for NaverMap providers
//

import Foundation

@objc public class NaverMapRegistry: NSObject {
    @objc public static let shared = NaverMapRegistry()

    @objc public private(set) var provider: NaverMapProvidable?

    private override init() {
        super.init()
    }

    /// Register a custom provider. Call this at app startup before using NaverMap.
    @objc public func register(provider: NaverMapProvidable) {
        self.provider = provider
    }

    /// Get the current provider, falling back to built-in provider if none registered
    @objc public func getProvider() -> NaverMapProvidable {
        if let provider = provider {
            return provider
        }

        // Auto-register built-in provider on first use
        let builtIn = BuiltInNaverMapProvider()
        self.provider = builtIn
        return builtIn
    }

    /// Check if a custom provider has been registered
    @objc public var hasCustomProvider: Bool {
        return provider != nil
    }

    /// Reset the provider (useful for testing)
    @objc public func reset() {
        provider = nil
    }
}
