import UIKit

/// Priority levels for image loading
@objc public enum GraniteProviderPriority: Int {
    case low = 0
    case normal = 1
    case high = 2
}

/// Cache policy for image loading
@objc public enum GraniteProviderCachePolicy: Int {
    case memory = 0
    case disk = 1
    case none = 2
}

/// Progress callback block
public typealias GraniteImageProgressBlock = (_ loaded: Int64, _ total: Int64) -> Void

/// Completion callback block
public typealias GraniteImageCompletionBlock = (_ image: UIImage?, _ error: Error?, _ imageSize: CGSize) -> Void

/// Protocol that defines the interface for image loading providers.
/// Implementations can use any image loading library (URLSession, SDWebImage, Kingfisher, etc.)
@objc public protocol GraniteImageProvidable: AnyObject {

    /// Creates and returns a new UIView that will be used to display the image.
    /// The returned view should be capable of displaying images (typically UIImageView).
    @objc func createImageView() -> UIView

    /// Loads an image from the given URL into the provided view.
    /// - Parameters:
    ///   - url: The URL string of the image to load
    ///   - view: The view returned from createImageView where the image should be displayed
    ///   - contentMode: The content mode to use when displaying the image
    @objc func loadImage(withURL url: String, into view: UIView, contentMode: UIView.ContentMode)

    /// Cancels any ongoing image load for the given view.
    /// - Parameter view: The view whose image load should be cancelled
    @objc func cancelLoad(with view: UIView)

    /// Loads an image with full options support including headers, priority, cache policy, and callbacks.
    /// - Parameters:
    ///   - url: The URL string of the image to load
    ///   - view: The view returned from createImageView where the image should be displayed (can be nil for preloading)
    ///   - contentMode: The content mode to use when displaying the image
    ///   - headers: Optional HTTP headers to include in the request
    ///   - priority: The loading priority
    ///   - cachePolicy: The cache policy to use
    ///   - defaultSource: Optional placeholder image URL or asset name to show while loading
    ///   - progress: Optional closure called with loading progress
    ///   - completion: Optional closure called when loading completes
    @objc optional func loadImage(
        withURL url: String,
        into view: UIView?,
        contentMode: UIView.ContentMode,
        headers: [String: String]?,
        priority: GraniteProviderPriority,
        cachePolicy: GraniteProviderCachePolicy,
        defaultSource: String?,
        progress: GraniteImageProgressBlock?,
        completion: GraniteImageCompletionBlock?
    )

    /// Applies a tint color to the image view
    /// - Parameters:
    ///   - tintColor: The color to apply
    ///   - view: The view to tint
    @objc optional func applyTintColor(_ tintColor: UIColor, to view: UIView)
}
