package run.granite.video.event

import run.granite.video.GraniteVideoEventListener
import run.granite.video.GraniteVideoEvents
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
        val event = GraniteVideoEvents.createLoadStartEvent(viewId, isNetwork, type, uri)
        dispatcher.dispatchEvent(viewId, "topVideoLoadStart", event)
    }

    override fun onLoad(data: GraniteVideoLoadData) {
        val event = GraniteVideoEvents.createLoadEvent(viewId, data)
        dispatcher.dispatchEvent(viewId, "topVideoLoad", event)
    }

    override fun onError(error: GraniteVideoErrorData) {
        val event = GraniteVideoEvents.createErrorEvent(viewId, error)
        dispatcher.dispatchEvent(viewId, "topVideoError", event)
    }

    override fun onProgress(data: GraniteVideoProgressData) {
        val event = GraniteVideoEvents.createProgressEvent(viewId, data)
        dispatcher.dispatchEvent(viewId, "topVideoProgress", event)
    }

    override fun onSeek(currentTime: Double, seekTime: Double) {
        val event = GraniteVideoEvents.createSeekEvent(viewId, currentTime, seekTime)
        dispatcher.dispatchEvent(viewId, "topVideoSeek", event)
    }

    override fun onEnd() {
        val event = GraniteVideoEvents.createEmptyEvent(viewId)
        dispatcher.dispatchEvent(viewId, "topVideoEnd", event)
    }

    override fun onBuffer(isBuffering: Boolean) {
        val event = GraniteVideoEvents.createBufferEvent(viewId, isBuffering)
        dispatcher.dispatchEvent(viewId, "topVideoBuffer", event)
    }

    override fun onBandwidthUpdate(bitrate: Double, width: Int, height: Int) {
        val event = GraniteVideoEvents.createBandwidthEvent(viewId, bitrate, width, height)
        dispatcher.dispatchEvent(viewId, "topVideoBandwidthUpdate", event)
    }

    override fun onPlaybackStateChanged(isPlaying: Boolean, isSeeking: Boolean, isLooping: Boolean) {
        val event = GraniteVideoEvents.createPlaybackStateEvent(viewId, isPlaying, isSeeking, isLooping)
        dispatcher.dispatchEvent(viewId, "topVideoPlaybackStateChanged", event)
    }

    override fun onPlaybackRateChange(rate: Float) {
        val event = GraniteVideoEvents.createPlaybackRateEvent(viewId, rate)
        dispatcher.dispatchEvent(viewId, "topVideoPlaybackRateChange", event)
    }

    override fun onVolumeChange(volume: Float) {
        val event = GraniteVideoEvents.createVolumeEvent(viewId, volume)
        dispatcher.dispatchEvent(viewId, "topVideoVolumeChange", event)
    }

    override fun onIdle() {
        val event = GraniteVideoEvents.createEmptyEvent(viewId)
        dispatcher.dispatchEvent(viewId, "topVideoIdle", event)
    }

    override fun onReadyForDisplay() {
        val event = GraniteVideoEvents.createEmptyEvent(viewId)
        dispatcher.dispatchEvent(viewId, "topVideoReadyForDisplay", event)
    }

    override fun onAudioFocusChanged(hasAudioFocus: Boolean) {
        val event = GraniteVideoEvents.createAudioFocusEvent(viewId, hasAudioFocus)
        dispatcher.dispatchEvent(viewId, "topVideoAudioFocusChanged", event)
    }

    override fun onAudioBecomingNoisy() {
        val event = GraniteVideoEvents.createEmptyEvent(viewId)
        dispatcher.dispatchEvent(viewId, "topVideoAudioBecomingNoisy", event)
    }

    override fun onFullscreenPlayerWillPresent() {
        val event = GraniteVideoEvents.createEmptyEvent(viewId)
        dispatcher.dispatchEvent(viewId, "topVideoFullscreenPlayerWillPresent", event)
    }

    override fun onFullscreenPlayerDidPresent() {
        val event = GraniteVideoEvents.createEmptyEvent(viewId)
        dispatcher.dispatchEvent(viewId, "topVideoFullscreenPlayerDidPresent", event)
    }

    override fun onFullscreenPlayerWillDismiss() {
        val event = GraniteVideoEvents.createEmptyEvent(viewId)
        dispatcher.dispatchEvent(viewId, "topVideoFullscreenPlayerWillDismiss", event)
    }

    override fun onFullscreenPlayerDidDismiss() {
        val event = GraniteVideoEvents.createEmptyEvent(viewId)
        dispatcher.dispatchEvent(viewId, "topVideoFullscreenPlayerDidDismiss", event)
    }

    override fun onPictureInPictureStatusChanged(isActive: Boolean) {
        val event = GraniteVideoEvents.createPipStatusEvent(viewId, isActive)
        dispatcher.dispatchEvent(viewId, "topVideoPictureInPictureStatusChanged", event)
    }

    override fun onControlsVisibilityChanged(isVisible: Boolean) {
        val event = GraniteVideoEvents.createControlsVisibilityEvent(viewId, isVisible)
        dispatcher.dispatchEvent(viewId, "topVideoControlsVisibilityChange", event)
    }

    override fun onAspectRatioChanged(width: Double, height: Double) {
        val event = GraniteVideoEvents.createAspectRatioEvent(viewId, width, height)
        dispatcher.dispatchEvent(viewId, "topVideoAspectRatio", event)
    }
}
