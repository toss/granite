package run.granite.video.provider.listener

import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.VideoSize
import androidx.media3.common.util.UnstableApi
import run.granite.video.provider.GraniteVideoDelegate
import run.granite.video.provider.GraniteVideoErrorData
import run.granite.video.provider.GraniteVideoLoadData

/**
 * Callback interface for playback state changes.
 */
interface PlaybackStateProvider {
    val isPlaying: Boolean
    val isSeeking: Boolean
    val isLooping: Boolean
    val currentTime: Double
    val duration: Double
}

/**
 * ExoPlayer event listener that delegates events to GraniteVideoDelegate.
 * Separated from ExoPlayerProvider for testability.
 */
@UnstableApi
class ExoPlayerEventListener(
    private val delegateProvider: () -> GraniteVideoDelegate?,
    private val stateProvider: PlaybackStateProvider,
    private val onPlayingChanged: (Boolean) -> Unit = {},
    private val onVideoSizeChanged: (Int, Int) -> Unit = { _, _ -> }
) : Player.Listener {

    private val delegate: GraniteVideoDelegate?
        get() = delegateProvider()

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
                delegate?.onReadyForDisplay()
                delegate?.onLoad(
                    GraniteVideoLoadData(
                        currentTime = stateProvider.currentTime,
                        duration = stateProvider.duration,
                        naturalWidth = 0.0, // Will be updated in onVideoSizeChanged
                        naturalHeight = 0.0,
                        orientation = "landscape"
                    )
                )
            }
            Player.STATE_ENDED -> {
                delegate?.onEnd()
            }
        }
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
        onPlayingChanged(isPlaying)
        delegate?.onPlaybackStateChanged(
            isPlaying = isPlaying,
            isSeeking = stateProvider.isSeeking,
            isLooping = stateProvider.isLooping
        )
    }

    override fun onPlayerError(error: PlaybackException) {
        delegate?.onError(
            GraniteVideoErrorData(
                code = error.errorCode,
                domain = "ExoPlayer",
                localizedDescription = error.message ?: "Unknown error",
                errorString = error.errorCodeName
            )
        )
    }

    override fun onVideoSizeChanged(videoSize: VideoSize) {
        val width = videoSize.width
        val height = videoSize.height

        if (width > 0 && height > 0) {
            onVideoSizeChanged(width, height)
            delegate?.onAspectRatioChanged(width.toDouble(), height.toDouble())

            // Update load data with actual dimensions
            delegate?.onLoad(
                GraniteVideoLoadData(
                    currentTime = stateProvider.currentTime,
                    duration = stateProvider.duration,
                    naturalWidth = width.toDouble(),
                    naturalHeight = height.toDouble(),
                    orientation = if (width > height) "landscape" else "portrait"
                )
            )
        }
    }
}
