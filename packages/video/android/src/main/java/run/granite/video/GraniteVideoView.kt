package run.granite.video

import android.content.Context
import android.widget.FrameLayout
import run.granite.video.provider.*

/**
 * Video view that wraps a GraniteVideoProvider.
 *
 * Provider selection:
 * - Default: Uses the provider set via GraniteVideoRegistry.setDefaultProvider()
 * - Fallback: Uses ExoPlayerProvider if no default is set
 * - Testing: Can inject a custom providerFactory for unit tests
 *
 * To change the default provider at runtime, use GraniteVideoModule.setDefaultProvider()
 * from JavaScript before creating new video views.
 */
class GraniteVideoView @JvmOverloads constructor(
    context: Context,
    private val providerFactory: (() -> GraniteVideoProvider)? = null
) : FrameLayout(context), GraniteVideoDelegate {

    private var provider: GraniteVideoProvider? = null
    private var playerView: android.view.View? = null

    // State
    private var paused: Boolean = true
    private var muted: Boolean = false
    private var volume: Float = 1.0f
    private var rate: Float = 1.0f
    private var repeat: Boolean = false
    private var resizeMode: String = "contain"

    // Event listener
    var eventListener: GraniteVideoEventListener? = null

    // Expose provider for testing
    val currentProvider: GraniteVideoProvider?
        get() = provider

    init {
        setupProvider(context)
    }

    private fun setupProvider(context: Context) {
        // Create provider using:
        // 1. Custom factory (for testing)
        // 2. Default from registry (set via GraniteVideoRegistry.setDefaultProvider)
        // 3. Fallback to ExoPlayerProvider
        provider = providerFactory?.invoke()
            ?: GraniteVideoRegistry.createProvider()
            ?: ExoPlayerProvider()

        provider?.delegate = this

        // Create player view
        playerView = provider?.createPlayerView(context)
        playerView?.let {
            it.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            addView(it)
        }
    }

    // Source
    fun setSource(source: Map<String, Any>?) {
        source ?: return

        val videoSource = GraniteVideoSource(
            uri = source["uri"] as? String,
            type = source["type"] as? String,
            startPosition = (source["startPosition"] as? Number)?.toDouble() ?: 0.0,
            cropStart = (source["cropStart"] as? Number)?.toDouble() ?: 0.0,
            cropEnd = (source["cropEnd"] as? Number)?.toDouble() ?: 0.0,
            headers = @Suppress("UNCHECKED_CAST") (source["headers"] as? Map<String, String>)
        )

        provider?.loadSource(videoSource)

        if (!paused) {
            provider?.play()
        }
    }

    // Playback Control
    fun setPaused(paused: Boolean) {
        this.paused = paused
        if (paused) {
            provider?.pause()
        } else {
            provider?.play()
        }
    }

    fun setMuted(muted: Boolean) {
        this.muted = muted
        provider?.setMuted(muted)
    }

    fun setVolume(volume: Float) {
        this.volume = volume
        provider?.setVolume(volume)
    }

    fun setRate(rate: Float) {
        this.rate = rate
        provider?.setRate(rate)
    }

    fun setRepeat(repeat: Boolean) {
        this.repeat = repeat
        provider?.setRepeat(repeat)
    }

    fun setResizeMode(mode: String) {
        this.resizeMode = mode
        val resizeModeEnum = when (mode) {
            "cover" -> GraniteVideoResizeMode.COVER
            "stretch" -> GraniteVideoResizeMode.STRETCH
            "none" -> GraniteVideoResizeMode.NONE
            else -> GraniteVideoResizeMode.CONTAIN
        }
        provider?.setResizeMode(resizeModeEnum)
    }

    // Controls
    fun setControls(enabled: Boolean) {
        provider?.setControlsEnabled(enabled)
    }

    fun setFullscreen(fullscreen: Boolean) {
        provider?.setFullscreen(fullscreen)
    }

    fun setPictureInPicture(enabled: Boolean) {
        provider?.setPictureInPictureEnabled(enabled)
    }

    fun setPlayInBackground(enabled: Boolean) {
        provider?.setPlayInBackground(enabled)
    }

    fun setPlayWhenInactive(enabled: Boolean) {
        provider?.setPlayWhenInactive(enabled)
    }

    // Buffer
    fun setBufferConfig(config: Map<String, Any>?) {
        config ?: return

        val bufferConfig = GraniteVideoBufferConfig(
            minBufferMs = (config["minBufferMs"] as? Number)?.toInt() ?: 15000,
            maxBufferMs = (config["maxBufferMs"] as? Number)?.toInt() ?: 50000,
            bufferForPlaybackMs = (config["bufferForPlaybackMs"] as? Number)?.toInt() ?: 2500,
            bufferForPlaybackAfterRebufferMs = (config["bufferForPlaybackAfterRebufferMs"] as? Number)?.toInt() ?: 5000,
            backBufferDurationMs = (config["backBufferDurationMs"] as? Number)?.toInt() ?: 0,
            cacheSizeMB = (config["cacheSizeMB"] as? Number)?.toInt() ?: 0
        )
        provider?.setBufferConfig(bufferConfig)
    }

    fun setMaxBitRate(bitRate: Int) {
        provider?.setMaxBitRate(bitRate)
    }

    fun setMinLoadRetryCount(count: Int) {
        provider?.setMinLoadRetryCount(count)
    }

    // Track Selection
    fun setSelectedAudioTrack(track: Map<String, Any>?) {
        track ?: return
        val selectedTrack = GraniteVideoSelectedTrack(
            type = track["type"] as? String ?: "system",
            value = track["value"] as? String
        )
        provider?.setSelectedAudioTrack(selectedTrack)
    }

    fun setSelectedTextTrack(track: Map<String, Any>?) {
        track ?: return
        val selectedTrack = GraniteVideoSelectedTrack(
            type = track["type"] as? String ?: "system",
            value = track["value"] as? String
        )
        provider?.setSelectedTextTrack(selectedTrack)
    }

    fun setSelectedVideoTrack(type: String, value: Int) {
        provider?.setSelectedVideoTrack(type, value)
    }

    // View Settings
    fun setUseTextureView(useTexture: Boolean) {
        provider?.setUseTextureView(useTexture)
    }

    fun setUseSecureView(useSecure: Boolean) {
        provider?.setUseSecureView(useSecure)
    }

    fun setShutterColor(color: Int) {
        provider?.setShutterColor(color)
    }

    fun setHideShutterView(hide: Boolean) {
        provider?.setHideShutterView(hide)
    }

    // Commands
    fun seek(time: Double, tolerance: Double = 0.0) {
        provider?.seek(time, tolerance)
    }

    fun seekCommand(time: Double, tolerance: Double) {
        seek(time, tolerance)
    }

    fun pauseCommand() {
        provider?.pause()
    }

    fun resumeCommand() {
        provider?.play()
    }

    fun setVolumeCommand(volume: Float) {
        setVolume(volume)
    }

    fun setFullScreenCommand(fullscreen: Boolean) {
        setFullscreen(fullscreen)
    }

    fun setSourceCommand(uri: String) {
        setSource(mapOf("uri" to uri))
    }

    fun enterPictureInPictureCommand() {
        provider?.enterPictureInPicture()
    }

    fun exitPictureInPictureCommand() {
        provider?.exitPictureInPicture()
    }

    // GraniteVideoDelegate Implementation
    override fun onLoadStart(isNetwork: Boolean, type: String, uri: String) {
        eventListener?.onLoadStart(isNetwork, type, uri)
    }

    override fun onLoad(data: GraniteVideoLoadData) {
        eventListener?.onLoad(data)
    }

    override fun onError(error: GraniteVideoErrorData) {
        eventListener?.onError(error)
    }

    override fun onProgress(data: GraniteVideoProgressData) {
        eventListener?.onProgress(data)
    }

    override fun onSeek(currentTime: Double, seekTime: Double) {
        eventListener?.onSeek(currentTime, seekTime)
    }

    override fun onEnd() {
        eventListener?.onEnd()
    }

    override fun onBuffer(isBuffering: Boolean) {
        eventListener?.onBuffer(isBuffering)
    }

    override fun onBandwidthUpdate(bitrate: Double, width: Int, height: Int) {
        eventListener?.onBandwidthUpdate(bitrate, width, height)
    }

    override fun onPlaybackStateChanged(isPlaying: Boolean, isSeeking: Boolean, isLooping: Boolean) {
        eventListener?.onPlaybackStateChanged(isPlaying, isSeeking, isLooping)
    }

    override fun onPlaybackRateChange(rate: Float) {
        eventListener?.onPlaybackRateChange(rate)
    }

    override fun onVolumeChange(volume: Float) {
        eventListener?.onVolumeChange(volume)
    }

    override fun onIdle() {
        eventListener?.onIdle()
    }

    override fun onReadyForDisplay() {
        eventListener?.onReadyForDisplay()
    }

    override fun onAudioFocusChanged(hasAudioFocus: Boolean) {
        eventListener?.onAudioFocusChanged(hasAudioFocus)
    }

    override fun onAudioBecomingNoisy() {
        eventListener?.onAudioBecomingNoisy()
    }

    override fun onFullscreenPlayerWillPresent() {
        eventListener?.onFullscreenPlayerWillPresent()
    }

    override fun onFullscreenPlayerDidPresent() {
        eventListener?.onFullscreenPlayerDidPresent()
    }

    override fun onFullscreenPlayerWillDismiss() {
        eventListener?.onFullscreenPlayerWillDismiss()
    }

    override fun onFullscreenPlayerDidDismiss() {
        eventListener?.onFullscreenPlayerDidDismiss()
    }

    override fun onPictureInPictureStatusChanged(isActive: Boolean) {
        eventListener?.onPictureInPictureStatusChanged(isActive)
    }

    override fun onControlsVisibilityChanged(isVisible: Boolean) {
        eventListener?.onControlsVisibilityChanged(isVisible)
    }

    override fun onAspectRatioChanged(width: Double, height: Double) {
        eventListener?.onAspectRatioChanged(width, height)
    }

    // Cleanup
    private fun releaseProvider() {
        provider?.release()
        provider = null
    }

    fun release() {
        releaseProvider()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        release()
    }
}

// Event Listener Interface
interface GraniteVideoEventListener {
    fun onLoadStart(isNetwork: Boolean, type: String, uri: String)
    fun onLoad(data: GraniteVideoLoadData)
    fun onError(error: GraniteVideoErrorData)
    fun onProgress(data: GraniteVideoProgressData)
    fun onSeek(currentTime: Double, seekTime: Double)
    fun onEnd()
    fun onBuffer(isBuffering: Boolean)
    fun onBandwidthUpdate(bitrate: Double, width: Int, height: Int)
    fun onPlaybackStateChanged(isPlaying: Boolean, isSeeking: Boolean, isLooping: Boolean)
    fun onPlaybackRateChange(rate: Float)
    fun onVolumeChange(volume: Float)
    fun onIdle()
    fun onReadyForDisplay()
    fun onAudioFocusChanged(hasAudioFocus: Boolean)
    fun onAudioBecomingNoisy()
    fun onFullscreenPlayerWillPresent()
    fun onFullscreenPlayerDidPresent()
    fun onFullscreenPlayerWillDismiss()
    fun onFullscreenPlayerDidDismiss()
    fun onPictureInPictureStatusChanged(isActive: Boolean)
    fun onControlsVisibilityChanged(isVisible: Boolean)
    fun onAspectRatioChanged(width: Double, height: Double)
}
