import Foundation

/// Singleton registry for managing the current GraniteImageProvidable.
/// Applications should register their provider implementation at app startup.
@objc public class GraniteImageRegistry: NSObject {

    /// Shared singleton instance
    @objc public static let shared = GraniteImageRegistry()

    /// The currently registered image provider.
    /// If nil, GraniteImage will display an error state.
    @objc public var provider: GraniteImageProvidable?

    private override init() {
        super.init()
    }

    /// Registers an image provider to be used by all GraniteImage instances.
    /// - Parameter provider: The provider implementation to register
    @objc public func register(provider: GraniteImageProvidable) {
        self.provider = provider
        NSLog("[GraniteImageRegistry] Provider registered: \(type(of: provider))")
    }

    /// Clears the currently registered provider.
    @objc public func clearProvider() {
        self.provider = nil
        NSLog("[GraniteImageRegistry] Provider cleared")
    }
}
