import Foundation
import UIKit

/// Priority level for animation loading
@objc public enum GraniteLottiePriority: Int {
    case low = 0
    case normal = 1
    case high = 2
}

/// Cache policy for animations
@objc public enum GraniteLottieCachePolicy: Int {
    case memory = 0
    case disk = 1
    case none = 2
}

/// Resize mode for animation view
@objc public enum GraniteLottieResizeMode: Int {
    case cover = 0
    case contain = 1
    case center = 2

    public var contentMode: UIView.ContentMode {
        switch self {
        case .cover:
            return .scaleAspectFill
        case .contain:
            return .scaleAspectFit
        case .center:
            return .center
        }
    }

    public static func from(string: String?) -> GraniteLottieResizeMode {
        switch string?.lowercased() {
        case "cover":
            return .cover
        case "center":
            return .center
        default:
            return .contain
        }
    }
}

/// Helper class for Objective-C interop with resize mode enum
@objc public class GraniteLottieResizeModeHelper: NSObject {
    @objc public static func fromString(_ string: String?) -> GraniteLottieResizeMode {
        return GraniteLottieResizeMode.from(string: string)
    }
}

/// Color filter configuration
@objc public class GraniteLottieColorFilter: NSObject {
    @objc public let keypath: String
    @objc public let color: UIColor

    @objc public init(keypath: String, color: UIColor) {
        self.keypath = keypath
        self.color = color
        super.init()
    }
}

/// Text filter configuration for iOS
@objc public class GraniteLottieTextFilter: NSObject {
    @objc public let keypath: String
    @objc public let text: String

    @objc public init(keypath: String, text: String) {
        self.keypath = keypath
        self.text = text
        super.init()
    }
}

/// Animation loading configuration
@objc public class GraniteLottieLoadConfig: NSObject {
    @objc public var speed: Double = 1.0
    @objc public var loop: Bool = true
    @objc public var autoPlay: Bool = false
    @objc public var progress: Float = 0.0
    @objc public var resizeMode: GraniteLottieResizeMode = .contain
    @objc public var colorFilters: [GraniteLottieColorFilter] = []
    @objc public var textFilters: [GraniteLottieTextFilter] = []
    @objc public var cacheComposition: Bool = true

    @objc public override init() {
        super.init()
    }
}

/// Delegate for animation events
@objc public protocol GraniteLottieDelegate: NSObjectProtocol {
    @objc optional func animationDidLoad()
    @objc optional func animationDidFinish(isCancelled: Bool)
    @objc optional func animationDidFail(error: String)
    @objc optional func animationDidLoop()
}

/// Provider protocol for Lottie animation implementations
/// Implement this protocol to provide custom animation rendering
@objc public protocol GraniteLottieProvidable: NSObjectProtocol {
    /// Create a new animation view
    @objc func createAnimationView() -> UIView

    /// Load animation from a local asset name
    @objc func loadAnimation(named name: String, into view: UIView, config: GraniteLottieLoadConfig)

    /// Load animation from a JSON string
    @objc func loadAnimation(json: String, into view: UIView, config: GraniteLottieLoadConfig)

    /// Load animation from a remote URL
    @objc func loadAnimation(url: URL, into view: UIView, config: GraniteLottieLoadConfig)

    /// Load .lottie file from URI
    @objc func loadDotLottie(uri: String, into view: UIView, config: GraniteLottieLoadConfig)

    /// Set the delegate for animation events
    @objc func setDelegate(_ delegate: GraniteLottieDelegate?, for view: UIView)

    /// Play animation
    @objc func play(view: UIView, startFrame: Int, endFrame: Int)

    /// Pause animation
    @objc func pause(view: UIView)

    /// Resume animation
    @objc func resume(view: UIView)

    /// Reset animation to initial state
    @objc func reset(view: UIView)

    /// Set animation progress (0-1)
    @objc func setProgress(_ progress: Float, for view: UIView)

    /// Set animation speed
    @objc func setSpeed(_ speed: Double, for view: UIView)

    /// Set loop mode
    @objc func setLoop(_ loop: Bool, for view: UIView)

    /// Apply color filters
    @objc optional func applyColorFilters(_ filters: [GraniteLottieColorFilter], to view: UIView)

    /// Apply text filters
    @objc optional func applyTextFilters(_ filters: [GraniteLottieTextFilter], to view: UIView)

    /// Cancel any ongoing load operation
    @objc func cancelLoad(view: UIView)
}
