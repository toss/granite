package com.anthropic.reactnativegranitevideo.provider

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
// Registry Singleton
// ============================================================

object GraniteVideoRegistry {
    private var provider: GraniteVideoProvider? = null
    private var providerFactory: (() -> GraniteVideoProvider)? = null

    fun register(provider: GraniteVideoProvider) {
        this.provider = provider
    }

    fun registerFactory(factory: () -> GraniteVideoProvider) {
        this.providerFactory = factory
    }

    fun createProvider(): GraniteVideoProvider? {
        providerFactory?.let { return it() }
        return provider
    }

    fun hasProvider(): Boolean {
        return provider != null || providerFactory != null
    }
}
