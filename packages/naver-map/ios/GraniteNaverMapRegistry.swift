//
//  GraniteNaverMapRegistry.swift
//  granite-naver-map
//
//  Registry singleton for NaverMap provider factories
//

import Foundation

@objc public class GraniteNaverMapRegistry: NSObject {
    @objc public static let shared = GraniteNaverMapRegistry()

    @objc public private(set) var factory: GraniteNaverMapProviderFactory?

    private override init() {
        super.init()
    }

    /// Register a custom provider factory. Call this at app startup before using NaverMap.
    @objc public func register(factory: GraniteNaverMapProviderFactory) {
        self.factory = factory
    }

    /// Create a new provider instance for a NaverMap view.
    /// Each view should call this to get its own provider instance.
    @objc public func createProvider() -> GraniteNaverMapProvidable? {
        // Use registered factory if available
        if let factory = factory {
            return factory.createProvider()
        }

        #if GRANITE_NAVER_MAP_DEFAULT_PROVIDER
        // Use built-in factory
        let builtInFactory = BuiltInNaverMapProviderFactory()
        return builtInFactory.createProvider()
        #else
        // No default provider available - user must register a custom factory
        return nil
        #endif
    }

    /// Check if a custom factory has been registered
    @objc public var hasCustomFactory: Bool {
        return factory != nil
    }

    /// Check if a default provider is available
    @objc public var hasDefaultProvider: Bool {
        #if GRANITE_NAVER_MAP_DEFAULT_PROVIDER
        return true
        #else
        return false
        #endif
    }

    /// Reset the factory (useful for testing)
    @objc public func reset() {
        factory = nil
    }
}
