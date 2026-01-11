package run.granite.video.provider

import android.content.Context
import android.net.Uri
import android.view.View
import android.view.SurfaceView
import android.view.TextureView
import android.widget.FrameLayout
import android.graphics.Color
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.exoplayer.DefaultLoadControl
import run.granite.video.provider.factory.DefaultExoPlayerFactory
import run.granite.video.provider.factory.DefaultMediaSourceFactory
import run.granite.video.provider.factory.DefaultVideoSurfaceFactory
import run.granite.video.provider.factory.ExoPlayerFactory
import run.granite.video.provider.factory.MediaSourceFactory
import run.granite.video.provider.factory.VideoSurfaceFactory
import run.granite.video.provider.listener.ExoPlayerEventListener
import run.granite.video.provider.listener.PlaybackStateProvider
import run.granite.video.provider.scheduler.HandlerProgressScheduler
import run.granite.video.provider.scheduler.ProgressScheduler

/**
 * Built-in ExoPlayer Provider (Default, using AndroidX Media3)
 *
 * This provider uses dependency injection for all external dependencies,
 * making it fully testable. Default implementations are provided for
 * production use.
 */
@UnstableApi
class ExoPlayerProvider(
    private val exoPlayerFactory: ExoPlayerFactory = DefaultExoPlayerFactory(),
    private val videoSurfaceFactory: VideoSurfaceFactory = DefaultVideoSurfaceFactory(),
    private val mediaSourceFactory: MediaSourceFactory = DefaultMediaSourceFactory(),
    private val progressScheduler: ProgressScheduler = HandlerProgressScheduler()
) : GraniteVideoProvider, PlaybackStateProvider {

    // Provider Identification
    override val providerId: String = "media3"
    override val providerName: String = "Media3 ExoPlayer"

    // Properties
    override var delegate: GraniteVideoDelegate? = null

    private var player: ExoPlayer? = null
    private var playerView: FrameLayout? = null
    private var surfaceView: SurfaceView? = null
    private var textureView: TextureView? = null
    private var context: Context? = null
    private var trackSelector: DefaultTrackSelector? = null
    private var eventListener: ExoPlayerEventListener? = null

    private var _isPlaying: Boolean = false
    private var _isSeeking: Boolean = false
    private var _shouldRepeat: Boolean = false
    private var _resizeMode: GraniteVideoResizeMode = GraniteVideoResizeMode.CONTAIN
    private var _useTextureView: Boolean = false
    private var _useSecureView: Boolean = false
    private var _playInBackground: Boolean = false
    private var _volume: Float = 1.0f
    private var _muted: Boolean = false
    private var _rate: Float = 1.0f
    private var _shutterColor: Int = Color.BLACK

    // PlaybackStateProvider implementation
    override val isPlaying: Boolean
        get() = _isPlaying

    override val isSeeking: Boolean
        get() = _isSeeking

    override val isLooping: Boolean
        get() = _shouldRepeat

    override val currentTime: Double
        get() = (player?.currentPosition ?: 0L) / 1000.0

    override val duration: Double
        get() = (player?.duration ?: 0L) / 1000.0

    // Required - View Creation
    override fun createPlayerView(context: Context): View {
        this.context = context

        playerView = videoSurfaceFactory.createContainer(context).apply {
            setBackgroundColor(_shutterColor)
        }

        // Initialize player
        trackSelector = DefaultTrackSelector(context)
        player = exoPlayerFactory.create(context, trackSelector!!)

        // Create and attach event listener
        eventListener = ExoPlayerEventListener(
            delegateProvider = { delegate },
            stateProvider = this,
            onPlayingChanged = { isPlaying -> _isPlaying = isPlaying },
            onVideoSizeChanged = { _, _ -> /* Handled by listener */ }
        )
        player?.addListener(eventListener!!)

        // Create surface/texture view
        setupVideoSurface(context)

        return playerView!!
    }

    private fun setupVideoSurface(context: Context) {
        // Remove existing views
        surfaceView?.let { playerView?.removeView(it) }
        textureView?.let { playerView?.removeView(it) }

        if (_useTextureView) {
            textureView = videoSurfaceFactory.createTextureView(context)
            player?.setVideoTextureView(textureView)
            playerView?.addView(textureView)
        } else {
            surfaceView = videoSurfaceFactory.createSurfaceView(context)
            player?.setVideoSurfaceView(surfaceView)
            playerView?.addView(surfaceView)
        }
    }

    // Required - Source Loading
    override fun loadSource(source: GraniteVideoSource) {
        val uri = source.uri ?: return
        val ctx = context ?: return

        delegate?.onLoadStart(
            isNetwork = uri.startsWith("http"),
            type = source.type ?: detectMediaType(uri),
            uri = uri
        )

        // Create data source factory with headers
        val httpDataSourceFactory = DefaultHttpDataSource.Factory().apply {
            source.headers?.let { headers ->
                setDefaultRequestProperties(headers)
            }
        }

        val dataSourceFactory = DefaultDataSource.Factory(ctx, httpDataSourceFactory)

        // Create media source using factory
        val mediaSource = mediaSourceFactory.create(source, dataSourceFactory)

        player?.setMediaSource(mediaSource)
        player?.prepare()

        // Seek to start position if specified
        if (source.startPosition > 0) {
            player?.seekTo(source.startPosition.toLong())
        }
    }

    override fun unload() {
        progressScheduler.cancel()
        player?.stop()
        player?.clearMediaItems()
    }

    // Required - Playback Control
    override fun play() {
        player?.play()
        _isPlaying = true
        startProgressUpdates()
        delegate?.onPlaybackStateChanged(isPlaying = true, isSeeking = false, isLooping = _shouldRepeat)
    }

    override fun pause() {
        player?.pause()
        _isPlaying = false
        progressScheduler.cancel()
        delegate?.onPlaybackStateChanged(isPlaying = false, isSeeking = false, isLooping = _shouldRepeat)
    }

    override fun seek(time: Double, tolerance: Double) {
        _isSeeking = true
        delegate?.onPlaybackStateChanged(isPlaying = _isPlaying, isSeeking = true, isLooping = _shouldRepeat)

        val positionMs = (time * 1000).toLong()
        player?.seekTo(positionMs)

        delegate?.onSeek(currentTime = currentTime, seekTime = time)
        _isSeeking = false
        delegate?.onPlaybackStateChanged(isPlaying = _isPlaying, isSeeking = false, isLooping = _shouldRepeat)
    }

    // Optional - Volume
    override fun setVolume(volume: Float) {
        _volume = volume
        player?.volume = if (_muted) 0f else volume
        delegate?.onVolumeChange(volume)
    }

    override fun setMuted(muted: Boolean) {
        _muted = muted
        player?.volume = if (muted) 0f else _volume
    }

    // Optional - Rate
    override fun setRate(rate: Float) {
        _rate = rate
        player?.setPlaybackSpeed(rate)
        delegate?.onPlaybackRateChange(rate)
    }

    // Optional - Repeat
    override fun setRepeat(shouldRepeat: Boolean) {
        _shouldRepeat = shouldRepeat
        player?.repeatMode = if (shouldRepeat) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
    }

    // Optional - Resize Mode
    override fun setResizeMode(mode: GraniteVideoResizeMode) {
        _resizeMode = mode
        // ExoPlayer handles resize mode differently - would need AspectRatioFrameLayout
    }

    // Optional - Background Playback
    override fun setPlayInBackground(enabled: Boolean) {
        _playInBackground = enabled
    }

    override fun setPlayWhenInactive(enabled: Boolean) {
        // Similar to playInBackground for Android
    }

    // Optional - Audio Output
    override fun setAudioOutput(output: GraniteVideoAudioOutput) {
        // Would require AudioManager configuration
    }

    // Optional - Fullscreen
    override fun setFullscreen(fullscreen: Boolean, animated: Boolean) {
        if (fullscreen) {
            delegate?.onFullscreenPlayerWillPresent()
            delegate?.onFullscreenPlayerDidPresent()
        } else {
            delegate?.onFullscreenPlayerWillDismiss()
            delegate?.onFullscreenPlayerDidDismiss()
        }
    }

    // Optional - Controls
    override fun setControlsEnabled(enabled: Boolean) {
        // Would need to add/remove control views
        delegate?.onControlsVisibilityChanged(enabled)
    }

    // Optional - Buffer Config
    override fun setBufferConfig(config: GraniteVideoBufferConfig) {
        val ctx = context ?: return

        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                config.minBufferMs,
                config.maxBufferMs,
                config.bufferForPlaybackMs,
                config.bufferForPlaybackAfterRebufferMs
            )
            .setBackBuffer(config.backBufferDurationMs, true)
            .build()

        // Note: Would need to rebuild player with new load control
    }

    override fun setMaxBitRate(bitRate: Int) {
        trackSelector?.setParameters(
            trackSelector!!.buildUponParameters()
                .setMaxVideoBitrate(bitRate)
        )
    }

    // Optional - Track Selection
    override fun setSelectedAudioTrack(track: GraniteVideoSelectedTrack) {
        // Would use trackSelector to select audio track
    }

    override fun setSelectedTextTrack(track: GraniteVideoSelectedTrack) {
        // Would use trackSelector to select text track
    }

    override fun setSelectedVideoTrack(type: String, value: Int) {
        // Would use trackSelector to select video track
    }

    // Optional - View Type
    override fun setUseTextureView(useTexture: Boolean) {
        if (_useTextureView != useTexture) {
            _useTextureView = useTexture
            context?.let { setupVideoSurface(it) }
        }
    }

    override fun setUseSecureView(useSecure: Boolean) {
        _useSecureView = useSecure
        if (useSecure) {
            surfaceView?.setSecure(true)
        }
    }

    // Optional - Shutter
    override fun setShutterColor(color: Int) {
        _shutterColor = color
        playerView?.setBackgroundColor(color)
    }

    override fun setHideShutterView(hide: Boolean) {
        playerView?.setBackgroundColor(if (hide) Color.TRANSPARENT else _shutterColor)
    }

    // Optional - Cache Management
    override fun clearCache() {
        // Would need cache implementation
    }

    // Optional - Codec Support
    override fun isCodecSupported(mimeType: String, width: Int, height: Int): Boolean {
        // Would check MediaCodecList
        return true
    }

    override fun isHEVCSupported(): Boolean {
        return isCodecSupported("video/hevc", 1920, 1080)
    }

    override fun getWidevineLevel(): Int {
        // Would check Widevine security level
        return 1
    }

    // Private helpers
    private fun detectMediaType(uri: String): String {
        return when {
            uri.contains(".m3u8") -> "hls"
            uri.contains(".mpd") -> "dash"
            uri.contains(".ism") -> "smoothstreaming"
            uri.contains(".mp4") -> "mp4"
            uri.contains(".webm") -> "webm"
            else -> "unknown"
        }
    }

    private fun startProgressUpdates() {
        progressScheduler.schedule(250) {
            player?.let { p ->
                val progressData = GraniteVideoProgressData(
                    currentTime = p.currentPosition / 1000.0,
                    playableDuration = p.bufferedPosition / 1000.0,
                    seekableDuration = p.duration / 1000.0
                )
                delegate?.onProgress(progressData)
            }
        }
    }

    // Cleanup
    fun release() {
        progressScheduler.cancel()
        eventListener?.let { player?.removeListener(it) }
        player?.release()
        player = null
        eventListener = null
        surfaceView = null
        textureView = null
        playerView = null
        context = null
    }
}
