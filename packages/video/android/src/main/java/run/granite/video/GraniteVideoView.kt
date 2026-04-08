package run.granite.video

import android.content.Context
import android.widget.FrameLayout
import run.granite.video.provider.*

/**
 * Video view that wraps a GraniteVideoProvider.
 *
 * Provider selection:
 * - Default: Uses the provider set via GraniteVideoRegistry.setDefaultProvider()
 * - Custom: Can inject a custom providerFactory for unit tests
 *
 * If no provider is registered, an IllegalStateException will be thrown.
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
        provider = providerFactory?.invoke()
            ?: GraniteVideoRegistry.createProvider()
            ?: throw IllegalStateException(
                "No video provider registered. Either register a provider via " +
                "GraniteVideoRegistry.registerFactory() or enable the default provider " +
                "by setting GRANITE_VIDEO_DEFAULT_PROVIDER=true."
            )

        provider?.delegate = this

        // Create player view
        playerView = provider?.createPlayerView(context)
        playerView?.let {
            it.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            addView(it)
        }
    }

    // Source
    @Suppress("UNCHECKED_CAST")
    fun setSource(source: Map<String, Any>?) {
        source ?: return

        val headers = source["headers"] as? Map<String, String>

        val videoSource = GraniteVideoSource(
            uri = source["uri"] as? String,
            type = source["type"] as? String,
            startTime = (source["startTime"] as? Number)?.toDouble() ?: 0.0,
            endTime = (source["endTime"] as? Number)?.toDouble() ?: 0.0,
            headers = headers,
            drm = parseDrm(source["drm"] as? Map<String, Any>),
            isNetwork = source["isNetwork"] as? Boolean,
            isAsset = source["isAsset"] as? Boolean ?: false,
            isLocalAssetFile = source["isLocalAssetFile"] as? Boolean ?: false,
            shouldCache = source["shouldCache"] as? Boolean ?: true,
            mainVer = (source["mainVer"] as? Number)?.toInt() ?: 0,
            patchVer = (source["patchVer"] as? Number)?.toInt() ?: 0,
            contentStartTime = (source["contentStartTime"] as? Number)?.toDouble() ?: -1.0,
            minLoadRetryCount = (source["minLoadRetryCount"] as? Number)?.toInt() ?: 3,
            textTracksAllowChunklessPreparation = source["textTracksAllowChunklessPreparation"] as? Boolean ?: true,
            metadata = parseMetadata(source["metadata"] as? Map<String, Any>),
            cmcd = parseCmcd(source["cmcd"] as? Map<String, Any>),
            textTracks = parseTextTracks(source["textTracks"] as? List<Map<String, Any>>),
            ad = parseAdsConfig(source["ad"] as? Map<String, Any>),
            bufferConfig = parseBufferConfig(source["bufferConfig"] as? Map<String, Any>)
        )

        provider?.loadSource(videoSource)

        if (!paused) {
            provider?.play()
        }
    }

    // Source parsing helper methods

    private fun parseDrm(map: Map<String, Any>?): GraniteVideoDrmConfig? {
        map ?: return null
        val typeStr = map["type"] as? String
        val drmType = when (typeStr) {
            "widevine" -> GraniteVideoDrmType.WIDEVINE
            "playready" -> GraniteVideoDrmType.PLAYREADY
            "clearkey" -> GraniteVideoDrmType.CLEARKEY
            else -> GraniteVideoDrmType.NONE
        }
        val headers = map["headers"] as? Map<String, String>
        return GraniteVideoDrmConfig(
            type = drmType,
            licenseServer = map["licenseServer"] as? String,
            headers = headers,
            contentId = map["contentId"] as? String
        )
    }

    private fun parseMetadata(map: Map<String, Any>?): GraniteVideoMetadata? {
        map ?: return null
        return GraniteVideoMetadata(
            title = map["title"] as? String,
            subtitle = map["subtitle"] as? String,
            description = map["description"] as? String,
            artist = map["artist"] as? String,
            imageUri = map["imageUri"] as? String
        )
    }

    private fun parseCmcd(map: Map<String, Any>?): GraniteVideoCmcdConfig? {
        map ?: return null
        return GraniteVideoCmcdConfig(
            mode = (map["mode"] as? Number)?.toInt() ?: 1,
            request = map["request"] as? Map<String, String>,
            session = map["session"] as? Map<String, String>,
            obj = map["object"] as? Map<String, String>,
            status = map["status"] as? Map<String, String>
        )
    }

    private fun parseTextTracks(list: List<Map<String, Any>>?): List<GraniteVideoTextTrack>? {
        list ?: return null
        return list.map { item ->
            GraniteVideoTextTrack(
                title = item["title"] as? String ?: "",
                language = item["language"] as? String ?: "",
                type = item["type"] as? String ?: "",
                uri = item["uri"] as? String ?: ""
            )
        }.ifEmpty { null }
    }

    private fun parseAdsConfig(map: Map<String, Any>?): GraniteVideoAdsConfig? {
        map ?: return null
        return GraniteVideoAdsConfig(
            type = map["type"] as? String,
            streamType = map["streamType"] as? String,
            adTagUrl = map["adTagUrl"] as? String,
            adLanguage = map["adLanguage"] as? String,
            contentSourceId = map["contentSourceId"] as? String,
            videoId = map["videoId"] as? String,
            assetKey = map["assetKey"] as? String,
            format = map["format"] as? String,
            fallbackUri = map["fallbackUri"] as? String,
            adTagParameters = map["adTagParameters"] as? Map<String, String>
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseBufferConfig(map: Map<String, Any>?): GraniteVideoBufferConfig? {
        map ?: return null
        val liveMap = map["live"] as? Map<String, Any>
        return GraniteVideoBufferConfig(
            minBufferMs = (map["minBufferMs"] as? Number)?.toInt() ?: 15000,
            maxBufferMs = (map["maxBufferMs"] as? Number)?.toInt() ?: 50000,
            bufferForPlaybackMs = (map["bufferForPlaybackMs"] as? Number)?.toInt() ?: 2500,
            bufferForPlaybackAfterRebufferMs = (map["bufferForPlaybackAfterRebufferMs"] as? Number)?.toInt() ?: 5000,
            backBufferDurationMs = (map["backBufferDurationMs"] as? Number)?.toInt() ?: 0,
            cacheSizeMB = (map["cacheSizeMB"] as? Number)?.toInt() ?: 0,
            live = liveMap?.let {
                GraniteVideoBufferConfigLive(
                    maxPlaybackSpeed = (it["maxPlaybackSpeed"] as? Number)?.toFloat() ?: -1f,
                    minPlaybackSpeed = (it["minPlaybackSpeed"] as? Number)?.toFloat() ?: -1f,
                    maxOffsetMs = (it["maxOffsetMs"] as? Number)?.toInt() ?: -1,
                    minOffsetMs = (it["minOffsetMs"] as? Number)?.toInt() ?: -1,
                    targetOffsetMs = (it["targetOffsetMs"] as? Number)?.toInt() ?: -1
                )
            }
        )
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

    fun setDisableAudioFocus(disable: Boolean) {
        provider?.setDisableAudioFocus(disable)
    }

    fun setPlayInBackground(enabled: Boolean) {
        provider?.setPlayInBackground(enabled)
    }

    fun setPlayWhenInactive(enabled: Boolean) {
        provider?.setPlayWhenInactive(enabled)
    }

    // Buffer
    @Suppress("UNCHECKED_CAST")
    fun setBufferConfig(config: Map<String, Any>?) {
        config ?: return

        val liveMap = config["live"] as? Map<String, Any>
        val bufferConfig = GraniteVideoBufferConfig(
            minBufferMs = (config["minBufferMs"] as? Number)?.toInt() ?: 15000,
            maxBufferMs = (config["maxBufferMs"] as? Number)?.toInt() ?: 50000,
            bufferForPlaybackMs = (config["bufferForPlaybackMs"] as? Number)?.toInt() ?: 2500,
            bufferForPlaybackAfterRebufferMs = (config["bufferForPlaybackAfterRebufferMs"] as? Number)?.toInt() ?: 5000,
            backBufferDurationMs = (config["backBufferDurationMs"] as? Number)?.toInt() ?: 0,
            cacheSizeMB = (config["cacheSizeMB"] as? Number)?.toInt() ?: 0,
            live = liveMap?.let {
                GraniteVideoBufferConfigLive(
                    maxPlaybackSpeed = (it["maxPlaybackSpeed"] as? Number)?.toFloat() ?: -1f,
                    minPlaybackSpeed = (it["minPlaybackSpeed"] as? Number)?.toFloat() ?: -1f,
                    maxOffsetMs = (it["maxOffsetMs"] as? Number)?.toInt() ?: -1,
                    minOffsetMs = (it["minOffsetMs"] as? Number)?.toInt() ?: -1,
                    targetOffsetMs = (it["targetOffsetMs"] as? Number)?.toInt() ?: -1
                )
            }
        )
        provider?.setBufferConfig(bufferConfig)
    }

    fun setMaxBitRate(bitRate: Int) {
        provider?.setMaxBitRate(bitRate)
    }

    fun setMinLoadRetryCount(count: Int) {
        provider?.setMinLoadRetryCount(count)
    }

    // Content Start Time
    fun setContentStartTime(time: Double) {
        provider?.setContentStartTime(time)
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

    override fun onTransferEnd(uri: String, bytesTransferred: Long) {
        eventListener?.onTransferEnd(uri, bytesTransferred)
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
    fun onTransferEnd(uri: String, bytesTransferred: Long) {}
}
