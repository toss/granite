import UIKit
import AVFoundation
import AVKit
import Combine

// MARK: - Player Container View

private class AVPlayerContainerView: UIView {
    var playerLayer: AVPlayerLayer? {
        didSet {
            if let layer = playerLayer {
                self.layer.addSublayer(layer)
                layer.frame = self.bounds
            }
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        playerLayer?.frame = self.bounds
    }
}

// MARK: - AVPlayerProvider

@objc public class AVPlayerProvider: NSObject, GraniteVideoProvidable {

    // MARK: - Properties

    @objc public weak var delegate: GraniteVideoDelegate?

    private var player: AVPlayer
    private var playerLayer: AVPlayerLayer
    private var playerView: AVPlayerContainerView?
    private var playerItem: AVPlayerItem?
    private var timeObserver: Any?
    private var pipController: AVPictureInPictureController?

    private var shouldRepeat: Bool = false
    private var isMuted: Bool = false
    private var playerVolume: Float = 1.0
    private var playerRate: Float = 1.0
    private var playInBackgroundEnabled: Bool = false
    private var playWhenInactiveEnabled: Bool = false
    private var isFullscreen: Bool = false
    private var pipEnabled: Bool = false
    private var preferredForwardBuffer: Double = 0
    private var automaticallyWaits: Bool = true
    private var allowsExternalPlaybackEnabled: Bool = true
    private var preventsDisplaySleep: Bool = true
    private var maxBitRateValue: Int = 0

    private var currentUri: String?
    private var hasLoadedData: Bool = false
    private var isSeekingFlag: Bool = false

    // Combine subscriptions
    private var cancellables = Set<AnyCancellable>()
    private var itemCancellables = Set<AnyCancellable>()

    // MARK: - Required Protocol Properties

    @objc public var currentTime: Double {
        guard playerItem != nil else { return 0 }
        return CMTimeGetSeconds(player.currentTime())
    }

    @objc public var duration: Double {
        guard let item = playerItem else { return 0 }
        let duration = item.duration
        if !duration.isValid || duration.isIndefinite {
            return 0
        }
        return CMTimeGetSeconds(duration)
    }

    @objc public var isPlaying: Bool {
        return player.rate != 0 && player.error == nil
    }

    // MARK: - Initialization

    @objc public override init() {
        player = AVPlayer()
        playerLayer = AVPlayerLayer(player: player)
        playerLayer.videoGravity = .resizeAspect

        super.init()

        player.allowsExternalPlayback = true

        setupPlayerObservers()
        setupNotificationObservers()
    }

    deinit {
        unload()
        cancellables.removeAll()
    }

    // MARK: - Combine Observers Setup

    private func setupPlayerObservers() {
        // Player rate changes (play/pause state)
        player.publisher(for: \.rate)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] rate in
                guard let self = self else { return }
                let isPlaying = rate != 0
                self.delegate?.videoPlaybackStateChanged?(isPlaying: isPlaying, isSeeking: self.isSeekingFlag, isLooping: self.shouldRepeat)
                self.delegate?.videoPlaybackRateChanged?(rate: rate)
            }
            .store(in: &cancellables)

        // Player time control status (buffering state)
        player.publisher(for: \.timeControlStatus)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                let isBuffering = (status == .waitingToPlayAtSpecifiedRate)
                self?.delegate?.videoBufferingStateChanged?(isBuffering: isBuffering)
            }
            .store(in: &cancellables)
    }

    private func setupNotificationObservers() {
        // App lifecycle notifications
        NotificationCenter.default.publisher(for: UIApplication.didEnterBackgroundNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.handleAppDidEnterBackground()
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.handleAppWillEnterForeground()
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: AVAudioSession.interruptionNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.handleAudioSessionInterruption()
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: AVAudioSession.routeChangeNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                self?.handleAudioRouteChange(notification)
            }
            .store(in: &cancellables)
    }

    private func setupPlayerItemObservers(for item: AVPlayerItem) {
        // Clear previous item observers
        itemCancellables.removeAll()

        // Player item status
        item.publisher(for: \.status)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                self?.handlePlayerItemStatusChange(status)
            }
            .store(in: &itemCancellables)

        // Playback end notification
        NotificationCenter.default.publisher(for: .AVPlayerItemDidPlayToEndTime, object: item)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.handlePlayerItemDidPlayToEndTime()
            }
            .store(in: &itemCancellables)
    }

    // MARK: - GraniteVideoProvidable Required

    @objc public func createPlayerView() -> UIView {
        let view = AVPlayerContainerView()
        view.backgroundColor = .black
        view.playerLayer = playerLayer
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        playerView = view
        return view
    }

    @objc public func loadSource(_ source: GraniteVideoSource) {
        guard let uri = source.uri, !uri.isEmpty else { return }

        // Cleanup previous item
        unloadPlayerItem()

        currentUri = uri
        hasLoadedData = false

        // Notify load start
        let isNetwork = uri.hasPrefix("http://") || uri.hasPrefix("https://")
        let type = source.type ?? ""
        delegate?.videoDidLoadStart?(isNetwork: isNetwork, type: type, uri: uri)

        // Create URL
        let url: URL?
        if isNetwork {
            url = URL(string: uri)
        } else {
            url = URL(fileURLWithPath: uri)
        }

        guard let validUrl = url else {
            let errorData = GraniteVideoErrorData()
            errorData.code = -1
            errorData.domain = "GraniteVideo"
            errorData.localizedDescription_ = "Invalid URL"
            delegate?.videoDidFail?(error: errorData)
            return
        }

        // Create player item
        let asset = AVURLAsset(url: validUrl)
        let item = AVPlayerItem(asset: asset)
        playerItem = item

        // Configure buffer
        if preferredForwardBuffer > 0 {
            item.preferredForwardBufferDuration = preferredForwardBuffer
        }

        if maxBitRateValue > 0 {
            item.preferredPeakBitRate = Double(maxBitRateValue)
        }

        // Setup Combine observers for this item
        setupPlayerItemObservers(for: item)

        // Replace current item
        player.replaceCurrentItem(with: item)

        // Set start position if specified
        if source.startPosition > 0 {
            let seekTime = CMTime(seconds: source.startPosition, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
            player.seek(to: seekTime)
        }

        // Add time observer for progress
        let interval = CMTime(seconds: 0.25, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserver = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] _ in
            self?.handleProgressUpdate()
        }

        // Apply settings
        player.isMuted = isMuted
        player.volume = playerVolume
        player.automaticallyWaitsToMinimizeStalling = automaticallyWaits
        player.allowsExternalPlayback = allowsExternalPlaybackEnabled

        // Setup PiP if available and enabled
        if pipEnabled {
            setupPictureInPicture()
        }
    }

    @objc public func unload() {
        unloadPlayerItem()
        currentUri = nil
        hasLoadedData = false
    }

    @objc public func play() {
        player.rate = playerRate
    }

    @objc public func pause() {
        player.pause()
    }

    @objc public func seek(to time: Double, toleranceBefore: Double, toleranceAfter: Double) {
        guard playerItem != nil else { return }

        isSeekingFlag = true

        let seekTime = CMTime(seconds: time, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        let toleranceBeforeTime = CMTime(seconds: toleranceBefore, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        let toleranceAfterTime = CMTime(seconds: toleranceAfter, preferredTimescale: CMTimeScale(NSEC_PER_SEC))

        let currentTimeBeforeSeek = CMTimeGetSeconds(player.currentTime())

        player.seek(to: seekTime, toleranceBefore: toleranceBeforeTime, toleranceAfter: toleranceAfterTime) { [weak self] finished in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isSeekingFlag = false
                if finished {
                    self.delegate?.videoDidSeek?(currentTime: currentTimeBeforeSeek, seekTime: time)
                }
            }
        }
    }

    // MARK: - GraniteVideoProvidable Optional

    @objc public func setVolume(_ volume: Float) {
        playerVolume = volume
        player.volume = volume
    }

    @objc public func setMuted(_ muted: Bool) {
        isMuted = muted
        player.isMuted = muted
    }

    @objc public func setRate(_ rate: Float) {
        playerRate = rate
        if player.rate != 0 {
            player.rate = rate
        }
    }

    @objc public func setRepeat(_ shouldRepeat: Bool) {
        self.shouldRepeat = shouldRepeat
    }

    @objc public func setResizeMode(_ mode: GraniteVideoResizeMode) {
        switch mode {
        case .contain:
            playerLayer.videoGravity = .resizeAspect
        case .cover:
            playerLayer.videoGravity = .resizeAspectFill
        case .stretch:
            playerLayer.videoGravity = .resize
        case .none:
            playerLayer.videoGravity = .resizeAspect
        @unknown default:
            playerLayer.videoGravity = .resizeAspect
        }
    }

    @objc public func setPlayInBackground(_ enabled: Bool) {
        playInBackgroundEnabled = enabled
    }

    @objc public func setPlayWhenInactive(_ enabled: Bool) {
        playWhenInactiveEnabled = enabled
    }

    @objc public func setPictureInPictureEnabled(_ enabled: Bool) {
        pipEnabled = enabled
        if enabled && playerItem != nil {
            setupPictureInPicture()
        }
    }

    @objc public func enterPictureInPicture() {
        if let pipController = pipController, pipController.isPictureInPicturePossible {
            pipController.startPictureInPicture()
        }
    }

    @objc public func exitPictureInPicture() {
        if let pipController = pipController, pipController.isPictureInPictureActive {
            pipController.stopPictureInPicture()
        }
    }

    @objc public func setFullscreen(_ fullscreen: Bool, animated: Bool) {
        isFullscreen = fullscreen
    }

    @objc public func setMaxBitRate(_ bitRate: Int) {
        maxBitRateValue = bitRate
        playerItem?.preferredPeakBitRate = Double(bitRate)
    }

    @objc public func setPreferredForwardBufferDuration(_ duration: Double) {
        preferredForwardBuffer = duration
        playerItem?.preferredForwardBufferDuration = duration
    }

    @objc public func setAutomaticallyWaitsToMinimizeStalling(_ waits: Bool) {
        automaticallyWaits = waits
        player.automaticallyWaitsToMinimizeStalling = waits
    }

    @objc public func setAllowsExternalPlayback(_ allows: Bool) {
        allowsExternalPlaybackEnabled = allows
        player.allowsExternalPlayback = allows
    }

    @objc public func setPreventsDisplaySleepDuringVideoPlayback(_ prevents: Bool) {
        preventsDisplaySleep = prevents
        player.preventsDisplaySleepDuringVideoPlayback = prevents
    }

    @objc public func setControlsEnabled(_ enabled: Bool) {
        // Native controls handled by AVPlayerViewController if needed
    }

    // MARK: - Private Methods

    private func unloadPlayerItem() {
        if let observer = timeObserver {
            player.removeTimeObserver(observer)
            timeObserver = nil
        }

        // Cancel all item-specific Combine subscriptions
        itemCancellables.removeAll()
        playerItem = nil

        player.replaceCurrentItem(with: nil)
        pipController = nil
    }

    private func setupPictureInPicture() {
        if AVPictureInPictureController.isPictureInPictureSupported() {
            pipController = AVPictureInPictureController(playerLayer: playerLayer)
            pipController?.delegate = self
        }
    }

    private func handleProgressUpdate() {
        guard playerItem != nil, hasLoadedData else { return }

        let currentTime = CMTimeGetSeconds(player.currentTime())
        let duration = self.duration

        var playableDuration: Double = 0
        if let loadedRanges = playerItem?.loadedTimeRanges, let firstRange = loadedRanges.first {
            let range = firstRange.timeRangeValue
            let start = CMTimeGetSeconds(range.start)
            let rangeDuration = CMTimeGetSeconds(range.duration)
            playableDuration = start + rangeDuration
        }

        let progressData = GraniteVideoProgressData()
        progressData.currentTime = currentTime
        progressData.playableDuration = playableDuration
        progressData.seekableDuration = duration

        delegate?.videoDidUpdateProgress?(data: progressData)
    }

    // MARK: - Event Handlers

    private func handlePlayerItemStatusChange(_ status: AVPlayerItem.Status) {
        guard let item = playerItem else { return }

        switch status {
        case .readyToPlay:
            if !hasLoadedData {
                hasLoadedData = true

                var naturalSize = CGSize.zero
                if let tracks = item.asset.tracks(withMediaType: .video).first {
                    naturalSize = tracks.naturalSize
                    let transform = tracks.preferredTransform
                    if transform.a == 0 && transform.d == 0 {
                        naturalSize = CGSize(width: naturalSize.height, height: naturalSize.width)
                    }
                }

                let loadData = GraniteVideoLoadData()
                loadData.currentTime = CMTimeGetSeconds(player.currentTime())
                loadData.duration = duration
                loadData.naturalWidth = naturalSize.width
                loadData.naturalHeight = naturalSize.height
                loadData.orientation = naturalSize.width >= naturalSize.height ? "landscape" : "portrait"

                delegate?.videoDidLoad?(data: loadData)
                delegate?.videoReadyForDisplay?()
            }

        case .failed:
            let nsError = item.error ?? NSError(domain: "GraniteVideo", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unknown error"])
            let errorData = GraniteVideoErrorData(error: nsError)
            delegate?.videoDidFail?(error: errorData)

        default:
            break
        }
    }

    private func handlePlayerItemDidPlayToEndTime() {
        delegate?.videoDidEnd?()

        if shouldRepeat {
            player.seek(to: .zero)
            player.play()
        }
    }

    private func handleAppDidEnterBackground() {
        if !playInBackgroundEnabled {
            playerLayer.player = nil
        }
    }

    private func handleAppWillEnterForeground() {
        if playerLayer.player == nil {
            playerLayer.player = player
        }
    }

    private func handleAudioSessionInterruption() {
        // Handle audio interruption
    }

    private func handleAudioRouteChange(_ notification: NotificationCenter.Publisher.Output) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        if reason == .oldDeviceUnavailable {
            delegate?.videoAudioBecomingNoisy?()
            player.pause()
        }
    }
}

// MARK: - AVPictureInPictureControllerDelegate

extension AVPlayerProvider: AVPictureInPictureControllerDelegate {
    public func pictureInPictureControllerDidStartPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        delegate?.videoPictureInPictureStatusChanged?(isActive: true)
    }

    public func pictureInPictureControllerDidStopPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        delegate?.videoPictureInPictureStatusChanged?(isActive: false)
    }

    public func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController,
                                           restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completionHandler: @escaping (Bool) -> Void) {
        delegate?.videoRestoreUserInterfaceForPictureInPictureStop?()
        completionHandler(true)
    }
}
