package com.anthropic.reactnativegranitevideo.provider

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.SurfaceView
import android.view.TextureView
import android.widget.FrameLayout
import android.graphics.Color
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.VideoSize
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.exoplayer.dash.DashMediaSource
import androidx.media3.exoplayer.smoothstreaming.SsMediaSource
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.exoplayer.DefaultLoadControl

/**
 * Built-in ExoPlayer Provider (Default, using AndroidX Media3)
 */
@UnstableApi
class ExoPlayerProvider : GraniteVideoProvider {

    // Properties
    override var delegate: GraniteVideoDelegate? = null

    private var player: ExoPlayer? = null
    private var playerView: FrameLayout? = null
    private var surfaceView: SurfaceView? = null
    private var textureView: TextureView? = null
    private var context: Context? = null
    private var trackSelector: DefaultTrackSelector? = null

    private var _isPlaying: Boolean = false
    private var _shouldRepeat: Boolean = false
    private var _resizeMode: GraniteVideoResizeMode = GraniteVideoResizeMode.CONTAIN
    private var _useTextureView: Boolean = false
    private var _useSecureView: Boolean = false
    private var _playInBackground: Boolean = false
    private var _volume: Float = 1.0f
    private var _muted: Boolean = false
    private var _rate: Float = 1.0f
    private var _shutterColor: Int = Color.BLACK

    private val mainHandler = Handler(Looper.getMainLooper())
    private var progressRunnable: Runnable? = null

    override val currentTime: Double
        get() = (player?.currentPosition ?: 0L) / 1000.0

    override val duration: Double
        get() = (player?.duration ?: 0L) / 1000.0

    override val isPlaying: Boolean
        get() = _isPlaying

    // Required - View Creation
    override fun createPlayerView(context: Context): View {
        this.context = context

        playerView = FrameLayout(context).apply {
            setBackgroundColor(_shutterColor)
        }

        // Initialize player
        trackSelector = DefaultTrackSelector(context)

        player = ExoPlayer.Builder(context)
            .setTrackSelector(trackSelector!!)
            .build()

        player?.addListener(playerListener)

        // Create surface/texture view
        setupVideoSurface(context)

        return playerView!!
    }

    private fun setupVideoSurface(context: Context) {
        // Remove existing views
        surfaceView?.let { playerView?.removeView(it) }
        textureView?.let { playerView?.removeView(it) }

        if (_useTextureView) {
            textureView = TextureView(context).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            player?.setVideoTextureView(textureView)
            playerView?.addView(textureView)
        } else {
            surfaceView = SurfaceView(context).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
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

        // Create media source based on type
        val mediaUri = Uri.parse(uri)
        val mediaSource: MediaSource = when {
            uri.contains(".m3u8") || source.type == "m3u8" -> {
                HlsMediaSource.Factory(dataSourceFactory)
                    .createMediaSource(MediaItem.fromUri(mediaUri))
            }
            uri.contains(".mpd") || source.type == "mpd" -> {
                DashMediaSource.Factory(dataSourceFactory)
                    .createMediaSource(MediaItem.fromUri(mediaUri))
            }
            uri.contains(".ism") || source.type == "ism" -> {
                SsMediaSource.Factory(dataSourceFactory)
                    .createMediaSource(MediaItem.fromUri(mediaUri))
            }
            else -> {
                ProgressiveMediaSource.Factory(dataSourceFactory)
                    .createMediaSource(MediaItem.fromUri(mediaUri))
            }
        }

        player?.setMediaSource(mediaSource)
        player?.prepare()

        // Seek to start position if specified
        if (source.startPosition > 0) {
            player?.seekTo(source.startPosition.toLong())
        }
    }

    override fun unload() {
        stopProgressUpdates()
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
        stopProgressUpdates()
        delegate?.onPlaybackStateChanged(isPlaying = false, isSeeking = false, isLooping = _shouldRepeat)
    }

    override fun seek(time: Double, tolerance: Double) {
        delegate?.onPlaybackStateChanged(isPlaying = _isPlaying, isSeeking = true, isLooping = _shouldRepeat)

        val positionMs = (time * 1000).toLong()
        player?.seekTo(positionMs)

        delegate?.onSeek(currentTime = currentTime, seekTime = time)
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
        stopProgressUpdates()

        progressRunnable = object : Runnable {
            override fun run() {
                player?.let { p ->
                    val progressData = GraniteVideoProgressData(
                        currentTime = p.currentPosition / 1000.0,
                        playableDuration = p.bufferedPosition / 1000.0,
                        seekableDuration = p.duration / 1000.0
                    )
                    delegate?.onProgress(progressData)
                }

                mainHandler.postDelayed(this, 250)
            }
        }

        mainHandler.post(progressRunnable!!)
    }

    private fun stopProgressUpdates() {
        progressRunnable?.let { mainHandler.removeCallbacks(it) }
        progressRunnable = null
    }

    // Player Listener
    private val playerListener = object : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
            when (playbackState) {
                Player.STATE_IDLE -> {
                    delegate?.onIdle()
                }
                Player.STATE_BUFFERING -> {
                    delegate?.onBuffer(true)
                }
                Player.STATE_READY -> {
                    delegate?.onBuffer(false)

                    val loadData = GraniteVideoLoadData(
                        currentTime = currentTime,
                        duration = duration,
                        naturalWidth = player?.videoSize?.width?.toDouble() ?: 0.0,
                        naturalHeight = player?.videoSize?.height?.toDouble() ?: 0.0,
                        orientation = if ((player?.videoSize?.width ?: 0) > (player?.videoSize?.height ?: 0))
                            "landscape" else "portrait"
                    )
                    delegate?.onLoad(loadData)
                    delegate?.onReadyForDisplay()
                }
                Player.STATE_ENDED -> {
                    delegate?.onEnd()
                }
            }
        }

        override fun onPlayerError(error: PlaybackException) {
            val errorData = GraniteVideoErrorData(
                code = error.errorCode,
                domain = "ExoPlayer",
                localizedDescription = error.message ?: "Unknown error",
                errorString = error.errorCodeName
            )
            delegate?.onError(errorData)
        }

        override fun onVideoSizeChanged(videoSize: VideoSize) {
            delegate?.onAspectRatioChanged(
                width = videoSize.width.toDouble(),
                height = videoSize.height.toDouble()
            )
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            _isPlaying = isPlaying
            delegate?.onPlaybackStateChanged(
                isPlaying = isPlaying,
                isSeeking = false,
                isLooping = _shouldRepeat
            )
        }
    }

    // Cleanup
    fun release() {
        stopProgressUpdates()
        player?.removeListener(playerListener)
        player?.release()
        player = null
        surfaceView = null
        textureView = null
        playerView = null
        context = null
    }
}
