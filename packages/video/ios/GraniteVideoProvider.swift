import UIKit
import AVFoundation

// ============================================================
// MARK: - Enums
// ============================================================

@objc public enum GraniteVideoResizeMode: Int {
    case contain = 0
    case cover = 1
    case stretch = 2
    case none = 3
}

@objc public enum GraniteVideoDrmType: Int {
    case none = 0
    case fairplay = 1
    case widevine = 2
    case playready = 3
    case clearkey = 4
}

@objc public enum GraniteVideoAudioOutput: Int {
    case speaker = 0
    case earpiece = 1
}

@objc public enum GraniteVideoIgnoreSilentSwitch: Int {
    case inherit = 0
    case ignore = 1
    case obey = 2
}

@objc public enum GraniteVideoMixWithOthers: Int {
    case inherit = 0
    case mix = 1
    case duck = 2
}

// ============================================================
// MARK: - Data Types
// ============================================================

@objc public class GraniteVideoDrmConfig: NSObject {
    @objc public var type: GraniteVideoDrmType = .none
    @objc public var licenseServer: String?
    @objc public var headers: [String: String]?
    @objc public var contentID: String?
    @objc public var certificateURL: String?
    @objc public var base64Certificate: Bool = false
}

@objc public class GraniteVideoSource: NSObject {
    @objc public var uri: String?
    @objc public var type: String?
    @objc public var startPosition: Double = 0
    @objc public var cropStart: Double = 0
    @objc public var cropEnd: Double = 0
    @objc public var headers: [String: String]?
    @objc public var drm: GraniteVideoDrmConfig?

    @objc public override init() {
        super.init()
    }

    @objc public convenience init(uri: String) {
        self.init()
        self.uri = uri
    }
}

@objc public class GraniteVideoBufferConfig: NSObject {
    @objc public var minBufferMs: Int = 15000
    @objc public var maxBufferMs: Int = 50000
    @objc public var bufferForPlaybackMs: Int = 2500
    @objc public var bufferForPlaybackAfterRebufferMs: Int = 5000
    @objc public var cacheSizeMB: Int = 0
}

@objc public class GraniteVideoSelectedTrack: NSObject {
    @objc public var type: String = "system"
    @objc public var value: String?
}

// ============================================================
// MARK: - Event Data Types
// ============================================================

@objc public class GraniteVideoLoadData: NSObject {
    @objc public var currentTime: Double = 0
    @objc public var duration: Double = 0
    @objc public var naturalWidth: Double = 0
    @objc public var naturalHeight: Double = 0
    @objc public var orientation: String = "landscape"
}

@objc public class GraniteVideoProgressData: NSObject {
    @objc public var currentTime: Double = 0
    @objc public var playableDuration: Double = 0
    @objc public var seekableDuration: Double = 0
}

@objc public class GraniteVideoErrorData: NSObject {
    @objc public var code: Int = 0
    @objc public var domain: String = ""
    @objc public var localizedDescription_: String = ""
    @objc public var localizedFailureReason_: String = ""
    @objc public var localizedRecoverySuggestion_: String = ""

    @objc public override init() {
        super.init()
    }

    @objc public convenience init(error: Error) {
        self.init()
        let nsError = error as NSError
        self.code = nsError.code
        self.domain = nsError.domain
        self.localizedDescription_ = nsError.localizedDescription
        self.localizedFailureReason_ = nsError.localizedFailureReason ?? ""
        self.localizedRecoverySuggestion_ = nsError.localizedRecoverySuggestion ?? ""
    }
}

// ============================================================
// MARK: - Delegate Protocol
// ============================================================

@objc public protocol GraniteVideoDelegate: AnyObject {
    @objc optional func videoDidLoadStart(isNetwork: Bool, type: String, uri: String)
    @objc optional func videoDidLoad(data: GraniteVideoLoadData)
    @objc optional func videoDidFail(error: GraniteVideoErrorData)
    @objc optional func videoDidUpdateProgress(data: GraniteVideoProgressData)
    @objc optional func videoDidSeek(currentTime: Double, seekTime: Double)
    @objc optional func videoDidEnd()
    @objc optional func videoBufferingStateChanged(isBuffering: Bool)
    @objc optional func videoBandwidthDidUpdate(bitrate: Double, width: Int, height: Int)
    @objc optional func videoPlaybackStateChanged(isPlaying: Bool, isSeeking: Bool, isLooping: Bool)
    @objc optional func videoPlaybackRateChanged(rate: Float)
    @objc optional func videoVolumeChanged(volume: Float)
    @objc optional func videoDidBecomeIdle()
    @objc optional func videoReadyForDisplay()
    @objc optional func videoAudioBecomingNoisy()
    @objc optional func videoFullscreenPlayerWillPresent()
    @objc optional func videoFullscreenPlayerDidPresent()
    @objc optional func videoFullscreenPlayerWillDismiss()
    @objc optional func videoFullscreenPlayerDidDismiss()
    @objc optional func videoPictureInPictureStatusChanged(isActive: Bool)
    @objc optional func videoRestoreUserInterfaceForPictureInPictureStop()
    @objc optional func videoControlsVisibilityChanged(isVisible: Bool)
    @objc optional func videoExternalPlaybackChanged(isActive: Bool)
    @objc optional func videoAspectRatioChanged(width: Double, height: Double)
}

// ============================================================
// MARK: - Provider Protocol
// ============================================================

@objc public protocol GraniteVideoProvidable: NSObjectProtocol {
    // Required - View Creation
    @objc func createPlayerView() -> UIView

    // Required - Source Loading
    @objc func loadSource(_ source: GraniteVideoSource)
    @objc func unload()

    // Required - Playback Control
    @objc func play()
    @objc func pause()
    @objc func seek(to time: Double, toleranceBefore: Double, toleranceAfter: Double)

    // Required - Properties
    @objc weak var delegate: GraniteVideoDelegate? { get set }
    @objc var currentTime: Double { get }
    @objc var duration: Double { get }
    @objc var isPlaying: Bool { get }

    // Optional - Volume
    @objc optional func setVolume(_ volume: Float)
    @objc optional func setMuted(_ muted: Bool)

    // Optional - Rate
    @objc optional func setRate(_ rate: Float)

    // Optional - Repeat
    @objc optional func setRepeat(_ shouldRepeat: Bool)

    // Optional - Resize Mode
    @objc optional func setResizeMode(_ mode: GraniteVideoResizeMode)

    // Optional - Background Playback
    @objc optional func setPlayInBackground(_ enabled: Bool)
    @objc optional func setPlayWhenInactive(_ enabled: Bool)

    // Optional - Audio Session
    @objc optional func setAudioOutput(_ output: GraniteVideoAudioOutput)
    @objc optional func setIgnoreSilentSwitch(_ mode: GraniteVideoIgnoreSilentSwitch)
    @objc optional func setMixWithOthers(_ mode: GraniteVideoMixWithOthers)

    // Optional - Fullscreen
    @objc optional func setFullscreen(_ fullscreen: Bool, animated: Bool)
    @objc optional func setFullscreenAutorotate(_ autorotate: Bool)
    @objc optional func setFullscreenOrientation(_ orientation: String)

    // Optional - Picture in Picture
    @objc optional func setPictureInPictureEnabled(_ enabled: Bool)
    @objc optional func enterPictureInPicture()
    @objc optional func exitPictureInPicture()

    // Optional - Controls
    @objc optional func setControlsEnabled(_ enabled: Bool)
    @objc optional func setPreventsDisplaySleepDuringVideoPlayback(_ prevents: Bool)

    // Optional - Buffer Config
    @objc optional func setBufferConfig(_ config: GraniteVideoBufferConfig)
    @objc optional func setMaxBitRate(_ bitRate: Int)
    @objc optional func setPreferredForwardBufferDuration(_ duration: Double)
    @objc optional func setAutomaticallyWaitsToMinimizeStalling(_ waits: Bool)

    // Optional - Track Selection
    @objc optional func setSelectedAudioTrack(_ track: GraniteVideoSelectedTrack)
    @objc optional func setSelectedTextTrack(_ track: GraniteVideoSelectedTrack)
    @objc optional func setSelectedVideoTrack(type: String, value: Int)

    // Optional - External Playback
    @objc optional func setAllowsExternalPlayback(_ allows: Bool)

    // Optional - DRM
    @objc optional func setDrmConfig(_ config: GraniteVideoDrmConfig)

    // Optional - Poster
    @objc optional func setPoster(_ url: String, resizeMode: GraniteVideoResizeMode)

    // Optional - Save
    @objc optional func save(type: String, completion: @escaping (String?, Error?) -> Void)

    // Optional - Cache Management
    @objc optional func clearCache()
}

// ============================================================
// MARK: - Registry
// ============================================================

public typealias GraniteVideoProviderFactory = () -> GraniteVideoProvidable

@objc public class GraniteVideoRegistry: NSObject {
    @objc public static let shared = GraniteVideoRegistry()

    private var internalProvider: GraniteVideoProvidable?
    private var providerFactory: GraniteVideoProviderFactory?

    private override init() {
        super.init()
    }

    @objc public var provider: GraniteVideoProvidable? {
        return internalProvider
    }

    @objc public func register(provider: GraniteVideoProvidable) {
        internalProvider = provider
    }

    @objc public func register(factory: @escaping GraniteVideoProviderFactory) {
        providerFactory = factory
    }

    @objc public func createProvider() -> GraniteVideoProvidable? {
        if let factory = providerFactory {
            return factory()
        }
        return internalProvider
    }

    @objc public func hasProvider() -> Bool {
        return internalProvider != nil || providerFactory != nil
    }
}
