import Foundation

/// Registry singleton for managing the Lottie provider
@objc public class GraniteLottieRegistry: NSObject {
    /// Shared singleton instance
    @objc public static let shared = GraniteLottieRegistry()

    /// The current registered provider
    @objc public private(set) var provider: GraniteLottieProvidable?

    private override init() {
        super.init()
    }

    /// Register a provider implementation
    /// Call this in your app's initialization (e.g., AppDelegate)
    /// - Parameter provider: The provider implementation to use
    @objc public func register(provider: GraniteLottieProvidable) {
        self.provider = provider
    }

    /// Check if a provider is registered
    @objc public var hasProvider: Bool {
        return provider != nil
    }
}
