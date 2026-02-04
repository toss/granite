package run.granite.video.event

import run.granite.video.GraniteVideoEventListener
import run.granite.video.provider.GraniteVideoErrorData
import run.granite.video.provider.GraniteVideoLoadData
import run.granite.video.provider.GraniteVideoProgressData

/**
 * Adapter that bridges GraniteVideoEventListener to VideoEventDispatcher.
 * Separated from ViewManager for testability.
 */
class VideoEventListenerAdapter(
    private val dispatcher: VideoEventDispatcher,
    private val viewIdProvider: () -> Int
) : GraniteVideoEventListener {

    private val viewId: Int
        get() = viewIdProvider()

    override fun onLoadStart(isNetwork: Boolean, type: String, uri: String) {
        dispatcher.dispatchEvent(
            GraniteVideoLoadStartEvent(dispatcher.getSurfaceId(), viewId, isNetwork, type, uri)
        )
    }

    override fun onLoad(data: GraniteVideoLoadData) {
        dispatcher.dispatchEvent(
            GraniteVideoLoadEvent(dispatcher.getSurfaceId(), viewId, data)
        )
    }

    override fun onError(error: GraniteVideoErrorData) {
        dispatcher.dispatchEvent(
            GraniteVideoErrorEvent(dispatcher.getSurfaceId(), viewId, error)
        )
    }

    override fun onProgress(data: GraniteVideoProgressData) {
        dispatcher.dispatchEvent(
            GraniteVideoProgressEvent(dispatcher.getSurfaceId(), viewId, data)
        )
    }

    override fun onSeek(currentTime: Double, seekTime: Double) {
        dispatcher.dispatchEvent(
            GraniteVideoSeekEvent(dispatcher.getSurfaceId(), viewId, currentTime, seekTime)
        )
    }

    override fun onEnd() {
        dispatcher.dispatchEvent(
            GraniteVideoEndEvent(dispatcher.getSurfaceId(), viewId)
        )
    }

    override fun onBuffer(isBuffering: Boolean) {
        dispatcher.dispatchEvent(
            GraniteVideoBufferEvent(dispatcher.getSurfaceId(), viewId, isBuffering)
        )
    }

    override fun onBandwidthUpdate(bitrate: Double, width: Int, height: Int) {
        dispatcher.dispatchEvent(
            GraniteVideoBandwidthUpdateEvent(dispatcher.getSurfaceId(), viewId, bitrate, width, height)
        )
    }

    override fun onPlaybackStateChanged(isPlaying: Boolean, isSeeking: Boolean, isLooping: Boolean) {
        dispatcher.dispatchEvent(
            GraniteVideoPlaybackStateChangedEvent(dispatcher.getSurfaceId(), viewId, isPlaying, isSeeking, isLooping)
        )
    }

    override fun onPlaybackRateChange(rate: Float) {
        dispatcher.dispatchEvent(
            GraniteVideoPlaybackRateChangeEvent(dispatcher.getSurfaceId(), viewId, rate)
        )
    }

    override fun onVolumeChange(volume: Float) {
        dispatcher.dispatchEvent(
            GraniteVideoVolumeChangeEvent(dispatcher.getSurfaceId(), viewId, volume)
        )
    }

    override fun onIdle() {
        dispatcher.dispatchEvent(
            GraniteVideoIdleEvent(dispatcher.getSurfaceId(), viewId)
        )
    }

    override fun onReadyForDisplay() {
        dispatcher.dispatchEvent(
            GraniteVideoReadyForDisplayEvent(dispatcher.getSurfaceId(), viewId)
        )
    }

    override fun onAudioFocusChanged(hasAudioFocus: Boolean) {
        dispatcher.dispatchEvent(
            GraniteVideoAudioFocusChangedEvent(dispatcher.getSurfaceId(), viewId, hasAudioFocus)
        )
    }

    override fun onAudioBecomingNoisy() {
        dispatcher.dispatchEvent(
            GraniteVideoAudioBecomingNoisyEvent(dispatcher.getSurfaceId(), viewId)
        )
    }

    override fun onFullscreenPlayerWillPresent() {
        dispatcher.dispatchEvent(
            GraniteVideoFullscreenPlayerWillPresentEvent(dispatcher.getSurfaceId(), viewId)
        )
    }

    override fun onFullscreenPlayerDidPresent() {
        dispatcher.dispatchEvent(
            GraniteVideoFullscreenPlayerDidPresentEvent(dispatcher.getSurfaceId(), viewId)
        )
    }

    override fun onFullscreenPlayerWillDismiss() {
        dispatcher.dispatchEvent(
            GraniteVideoFullscreenPlayerWillDismissEvent(dispatcher.getSurfaceId(), viewId)
        )
    }

    override fun onFullscreenPlayerDidDismiss() {
        dispatcher.dispatchEvent(
            GraniteVideoFullscreenPlayerDidDismissEvent(dispatcher.getSurfaceId(), viewId)
        )
    }

    override fun onPictureInPictureStatusChanged(isActive: Boolean) {
        dispatcher.dispatchEvent(
            GraniteVideoPictureInPictureStatusChangedEvent(dispatcher.getSurfaceId(), viewId, isActive)
        )
    }

    override fun onControlsVisibilityChanged(isVisible: Boolean) {
        dispatcher.dispatchEvent(
            GraniteVideoControlsVisibilityChangeEvent(dispatcher.getSurfaceId(), viewId, isVisible)
        )
    }

    override fun onAspectRatioChanged(width: Double, height: Double) {
        dispatcher.dispatchEvent(
            GraniteVideoAspectRatioEvent(dispatcher.getSurfaceId(), viewId, width, height)
        )
    }

    override fun onTransferEnd(uri: String, bytesTransferred: Long) {
        val event = GraniteVideoEvents.createTransferEndEvent(viewId, uri, bytesTransferred)
        dispatcher.dispatchEvent(viewId, "topVideoTransferEnd", event)
    }
}
