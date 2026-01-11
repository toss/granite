package run.granite.video.provider

import android.content.Context
import android.view.View

// ============================================================
// Enums
// ============================================================

enum class GraniteVideoResizeMode {
    CONTAIN,
    COVER,
    STRETCH,
    NONE
}

enum class GraniteVideoDrmType {
    NONE,
    WIDEVINE,
    PLAYREADY,
    CLEARKEY
}

enum class GraniteVideoAudioOutput {
    SPEAKER,
    EARPIECE
}

// ============================================================
// Data Classes
// ============================================================

data class GraniteVideoSource(
    val uri: String? = null,
    val type: String? = null,
    val startPosition: Double = 0.0,
    val cropStart: Double = 0.0,
    val cropEnd: Double = 0.0,
    val headers: Map<String, String>? = null,
    val drm: GraniteVideoDrmConfig? = null
)

data class GraniteVideoDrmConfig(
    val type: GraniteVideoDrmType = GraniteVideoDrmType.NONE,
    val licenseServer: String? = null,
    val headers: Map<String, String>? = null,
    val contentId: String? = null
)

data class GraniteVideoBufferConfig(
    val minBufferMs: Int = 15000,
    val maxBufferMs: Int = 50000,
    val bufferForPlaybackMs: Int = 2500,
    val bufferForPlaybackAfterRebufferMs: Int = 5000,
    val backBufferDurationMs: Int = 0,
    val cacheSizeMB: Int = 0
)

data class GraniteVideoSelectedTrack(
    val type: String = "system",
    val value: String? = null
)

// ============================================================
// Event Data Classes
// ============================================================

data class GraniteVideoLoadData(
    val currentTime: Double = 0.0,
    val duration: Double = 0.0,
    val naturalWidth: Double = 0.0,
    val naturalHeight: Double = 0.0,
    val orientation: String = "landscape"
)

data class GraniteVideoProgressData(
    val currentTime: Double = 0.0,
    val playableDuration: Double = 0.0,
    val seekableDuration: Double = 0.0
)

data class GraniteVideoErrorData(
    val code: Int = 0,
    val domain: String = "",
    val localizedDescription: String = "",
    val errorString: String = ""
)

// ============================================================
// Delegate Interface
// ============================================================

interface GraniteVideoDelegate {
    fun onLoadStart(isNetwork: Boolean, type: String, uri: String) {}
    fun onLoad(data: GraniteVideoLoadData) {}
    fun onError(error: GraniteVideoErrorData) {}
    fun onProgress(data: GraniteVideoProgressData) {}
    fun onSeek(currentTime: Double, seekTime: Double) {}
    fun onEnd() {}
    fun onBuffer(isBuffering: Boolean) {}
    fun onBandwidthUpdate(bitrate: Double, width: Int, height: Int) {}
    fun onPlaybackStateChanged(isPlaying: Boolean, isSeeking: Boolean, isLooping: Boolean) {}
    fun onPlaybackRateChange(rate: Float) {}
    fun onVolumeChange(volume: Float) {}
    fun onIdle() {}
    fun onReadyForDisplay() {}
    fun onAudioFocusChanged(hasAudioFocus: Boolean) {}
    fun onAudioBecomingNoisy() {}
    fun onFullscreenPlayerWillPresent() {}
    fun onFullscreenPlayerDidPresent() {}
    fun onFullscreenPlayerWillDismiss() {}
    fun onFullscreenPlayerDidDismiss() {}
    fun onPictureInPictureStatusChanged(isActive: Boolean) {}
    fun onControlsVisibilityChanged(isVisible: Boolean) {}
    fun onAspectRatioChanged(width: Double, height: Double) {}
}

// ============================================================
// Provider Interface
// ============================================================

interface GraniteVideoProvider {
    // Required - Provider Identification
    val providerId: String
    val providerName: String

    // Required - View Creation
    fun createPlayerView(context: Context): View

    // Required - Source Loading
    fun loadSource(source: GraniteVideoSource)
    fun unload()

    // Required - Playback Control
    fun play()
    fun pause()
    fun seek(time: Double, tolerance: Double = 0.0)

    // Required - Properties
    var delegate: GraniteVideoDelegate?
    val currentTime: Double
    val duration: Double
    val isPlaying: Boolean

    // Optional - Volume
    fun setVolume(volume: Float) {}
    fun setMuted(muted: Boolean) {}

    // Optional - Rate
    fun setRate(rate: Float) {}

    // Optional - Repeat
    fun setRepeat(shouldRepeat: Boolean) {}

    // Optional - Resize Mode
    fun setResizeMode(mode: GraniteVideoResizeMode) {}

    // Optional - Background Playback
    fun setPlayInBackground(enabled: Boolean) {}
    fun setPlayWhenInactive(enabled: Boolean) {}

    // Optional - Audio Output
    fun setAudioOutput(output: GraniteVideoAudioOutput) {}

    // Optional - Fullscreen
    fun setFullscreen(fullscreen: Boolean, animated: Boolean = true) {}
    fun setFullscreenAutorotate(autorotate: Boolean) {}
    fun setFullscreenOrientation(orientation: String) {}

    // Optional - Picture in Picture
    fun setPictureInPictureEnabled(enabled: Boolean) {}
    fun enterPictureInPicture() {}
    fun exitPictureInPicture() {}

    // Optional - Controls
    fun setControlsEnabled(enabled: Boolean) {}
    fun setPreventsDisplaySleepDuringVideoPlayback(prevents: Boolean) {}

    // Optional - Buffer Config
    fun setBufferConfig(config: GraniteVideoBufferConfig) {}
    fun setMaxBitRate(bitRate: Int) {}
    fun setMinLoadRetryCount(count: Int) {}

    // Optional - Track Selection
    fun setSelectedAudioTrack(track: GraniteVideoSelectedTrack) {}
    fun setSelectedTextTrack(track: GraniteVideoSelectedTrack) {}
    fun setSelectedVideoTrack(type: String, value: Int) {}

    // Optional - DRM
    fun setDrmConfig(config: GraniteVideoDrmConfig) {}

    // Optional - View Type
    fun setUseTextureView(useTexture: Boolean) {}
    fun setUseSecureView(useSecure: Boolean) {}

    // Optional - Shutter
    fun setShutterColor(color: Int) {}
    fun setHideShutterView(hide: Boolean) {}

    // Optional - Cache Management
    fun clearCache() {}

    // Optional - Codec Support
    fun isCodecSupported(mimeType: String, width: Int, height: Int): Boolean = false
    fun isHEVCSupported(): Boolean = false
    fun getWidevineLevel(): Int = 0
}

// ============================================================
// Provider Info
// ============================================================

data class ProviderInfo(
    val id: String,
    val name: String
)

// ============================================================
// Registry Singleton
// ============================================================

object GraniteVideoRegistry {
    // Multi-provider storage: id -> factory
    private val providers = mutableMapOf<String, () -> GraniteVideoProvider>()
    private var defaultProviderId: String? = null

    // Legacy support
    private var legacyFactory: (() -> GraniteVideoProvider)? = null
    private var legacyProvider: GraniteVideoProvider? = null

    // ============================================================
    // New API - Multi-Provider Support
    // ============================================================

    /**
     * Register a provider factory with a specific ID.
     * If the ID already exists, it will be overwritten.
     */
    fun registerFactory(id: String, factory: () -> GraniteVideoProvider) {
        providers[id] = factory
    }

    /**
     * Create a provider instance by ID.
     * Returns null if the ID is not registered.
     */
    fun createProvider(id: String): GraniteVideoProvider? {
        return providers[id]?.invoke()
    }

    /**
     * Set the default provider ID.
     * When createProvider() is called without an ID, this provider will be created.
     */
    fun setDefaultProvider(id: String) {
        defaultProviderId = id
    }

    /**
     * Get list of all registered provider IDs.
     */
    fun getAvailableProviders(): List<String> {
        return providers.keys.toList()
    }

    /**
     * Get provider info by ID.
     * Creates a temporary instance to read providerId and providerName.
     */
    fun getProviderInfo(id: String): ProviderInfo? {
        val factory = providers[id] ?: return null
        val provider = factory()
        return ProviderInfo(id = provider.providerId, name = provider.providerName)
    }

    /**
     * Clear all registered providers and reset state.
     * Primarily used for testing.
     */
    @androidx.annotation.VisibleForTesting
    fun clear() {
        providers.clear()
        defaultProviderId = null
        legacyFactory = null
        legacyProvider = null
    }

    // ============================================================
    // Legacy API - Backward Compatibility
    // ============================================================

    /**
     * Register a provider instance (legacy).
     */
    fun register(provider: GraniteVideoProvider) {
        legacyProvider = provider
        // Also register in new system if it has an ID
        registerFactory(provider.providerId) { provider }
    }

    /**
     * Register a provider factory without ID (legacy).
     * The factory will be used as fallback when no ID is specified.
     */
    fun registerFactory(factory: () -> GraniteVideoProvider) {
        legacyFactory = factory
        // Create one instance to get the ID and register
        val instance = factory()
        registerFactory(instance.providerId, factory)
    }

    /**
     * Create a provider instance (legacy/default).
     * Priority:
     * 1. Default provider ID if set
     * 2. Legacy factory
     * 3. Legacy provider instance
     * 4. First available provider
     */
    fun createProvider(): GraniteVideoProvider? {
        // 1. Try default provider
        defaultProviderId?.let { id ->
            return providers[id]?.invoke()
        }

        // 2. Try legacy factory (also registered in providers map)
        legacyFactory?.let { return it() }

        // 3. Try legacy provider
        legacyProvider?.let { return it }

        // 4. Return first available
        return providers.values.firstOrNull()?.invoke()
    }

    /**
     * Check if any provider is registered.
     */
    fun hasProvider(): Boolean {
        return providers.isNotEmpty() || legacyFactory != null || legacyProvider != null
    }
}
