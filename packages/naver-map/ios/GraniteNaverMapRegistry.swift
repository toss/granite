//
//  GraniteGraniteNaverMapRegistry.swift
//  granite-naver-map
//
//  Registry singleton for NaverMap providers
//

import Foundation

@objc public class GraniteNaverMapRegistry: NSObject {
    @objc public static let shared = GraniteNaverMapRegistry()

    @objc public private(set) var provider: GraniteNaverMapProvidable?

    private override init() {
        super.init()
    }

    /// Register a custom provider. Call this at app startup before using NaverMap.
    @objc public func register(provider: GraniteNaverMapProvidable) {
        self.provider = provider
    }

    /// Get the current provider, falling back to built-in provider if none registered
    @objc public func getProvider() -> GraniteNaverMapProvidable? {
        if let provider = provider {
            return provider
        }

        #if GRANITE_NAVER_MAP_DEFAULT_PROVIDER
        // Auto-register built-in provider on first use
        let builtIn = BuiltInNaverMapProvider()
        self.provider = builtIn
        return builtIn
        #else
        // No default provider available - user must register a custom provider
        return nil
        #endif
    }

    /// Check if a custom provider has been registered
    @objc public var hasCustomProvider: Bool {
        return provider != nil
    }

    /// Check if a default provider is available
    @objc public var hasDefaultProvider: Bool {
        #if GRANITE_NAVER_MAP_DEFAULT_PROVIDER
        return true
        #else
        return false
        #endif
    }

    /// Reset the provider (useful for testing)
    @objc public func reset() {
        provider = nil
    }
}
