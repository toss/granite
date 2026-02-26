package run.granite.video

import android.graphics.Color
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.GraniteVideoViewManagerInterface
import com.facebook.react.viewmanagers.GraniteVideoViewManagerDelegate
import com.facebook.react.common.MapBuilder
import run.granite.video.event.DefaultVideoEventDispatcherFactory
import run.granite.video.event.VideoEventDispatcherFactory
import run.granite.video.event.VideoEventListenerAdapter

/**
 * React Native ViewManager for GraniteVideoView.
 *
 * This manager supports:
 * - Provider selection via `providerId` prop
 * - All standard video props (source, paused, volume, etc.)
 * - Commands for playback control
 *
 * The ViewManager uses dependency injection for the event dispatcher factory,
 * making it testable without React Native context.
 */
@ReactModule(name = GraniteVideoViewManager.NAME)
class GraniteVideoViewManager(
    private val eventDispatcherFactory: VideoEventDispatcherFactory = DefaultVideoEventDispatcherFactory()
) : SimpleViewManager<GraniteVideoView>(),
    GraniteVideoViewManagerInterface<GraniteVideoView> {

    private val mDelegate: ViewManagerDelegate<GraniteVideoView> = GraniteVideoViewManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<GraniteVideoView> = mDelegate

    override fun getName(): String = NAME

    override fun createViewInstance(context: ThemedReactContext): GraniteVideoView {
        val view = GraniteVideoView(context)

        // Set up event dispatcher and listener
        val dispatcher = eventDispatcherFactory.create(view)
        view.eventListener = VideoEventListenerAdapter(
            dispatcher = dispatcher,
            viewIdProvider = { view.id }
        )

        return view
    }

    override fun onDropViewInstance(view: GraniteVideoView) {
        super.onDropViewInstance(view)
        view.release()
    }

    // Props
    @ReactProp(name = "source")
    override fun setSource(view: GraniteVideoView?, source: ReadableMap?) {
        @Suppress("UNCHECKED_CAST")
        view?.setSource(source?.toHashMap()?.filterValues { it != null } as? Map<String, Any>)
    }

    @ReactProp(name = "paused")
    override fun setPaused(view: GraniteVideoView?, paused: Boolean) {
        view?.setPaused(paused)
    }

    @ReactProp(name = "muted")
    override fun setMuted(view: GraniteVideoView?, muted: Boolean) {
        view?.setMuted(muted)
    }

    @ReactProp(name = "volume", defaultFloat = 1.0f)
    override fun setVolume(view: GraniteVideoView?, volume: Float) {
        view?.setVolume(volume)
    }

    @ReactProp(name = "rate", defaultFloat = 1.0f)
    override fun setRate(view: GraniteVideoView?, rate: Float) {
        view?.setRate(rate)
    }

    @ReactProp(name = "repeat")
    override fun setRepeat(view: GraniteVideoView?, repeat: Boolean) {
        view?.setRepeat(repeat)
    }

    @ReactProp(name = "resizeMode")
    override fun setResizeMode(view: GraniteVideoView?, resizeMode: String?) {
        view?.setResizeMode(resizeMode ?: "contain")
    }

    @ReactProp(name = "controls")
    override fun setControls(view: GraniteVideoView?, controls: Boolean) {
        view?.setControls(controls)
    }

    @ReactProp(name = "fullscreen")
    override fun setFullscreen(view: GraniteVideoView?, fullscreen: Boolean) {
        view?.setFullscreen(fullscreen)
    }

    @ReactProp(name = "pictureInPicture")
    override fun setPictureInPicture(view: GraniteVideoView?, pictureInPicture: Boolean) {
        view?.setPictureInPicture(pictureInPicture)
    }

    @ReactProp(name = "playInBackground")
    override fun setPlayInBackground(view: GraniteVideoView?, playInBackground: Boolean) {
        view?.setPlayInBackground(playInBackground)
    }

    @ReactProp(name = "playWhenInactive")
    override fun setPlayWhenInactive(view: GraniteVideoView?, playWhenInactive: Boolean) {
        view?.setPlayWhenInactive(playWhenInactive)
    }

    @ReactProp(name = "bufferConfig")
    override fun setBufferConfig(view: GraniteVideoView?, bufferConfig: ReadableMap?) {
        @Suppress("UNCHECKED_CAST")
        view?.setBufferConfig(bufferConfig?.toHashMap()?.filterValues { it != null } as? Map<String, Any>)
    }

    @ReactProp(name = "maxBitRate")
    override fun setMaxBitRate(view: GraniteVideoView?, maxBitRate: Int) {
        view?.setMaxBitRate(maxBitRate)
    }

    @ReactProp(name = "minLoadRetryCount")
    override fun setMinLoadRetryCount(view: GraniteVideoView?, minLoadRetryCount: Int) {
        view?.setMinLoadRetryCount(minLoadRetryCount)
    }

    @ReactProp(name = "selectedAudioTrack")
    override fun setSelectedAudioTrack(view: GraniteVideoView?, selectedAudioTrack: ReadableMap?) {
        @Suppress("UNCHECKED_CAST")
        view?.setSelectedAudioTrack(selectedAudioTrack?.toHashMap()?.filterValues { it != null } as? Map<String, Any>)
    }

    @ReactProp(name = "selectedTextTrack")
    override fun setSelectedTextTrack(view: GraniteVideoView?, selectedTextTrack: ReadableMap?) {
        @Suppress("UNCHECKED_CAST")
        view?.setSelectedTextTrack(selectedTextTrack?.toHashMap()?.filterValues { it != null } as? Map<String, Any>)
    }

    @ReactProp(name = "selectedVideoTrack")
    override fun setSelectedVideoTrack(view: GraniteVideoView?, selectedVideoTrack: ReadableMap?) {
        val type = selectedVideoTrack?.getString("type") ?: "auto"
        val value = selectedVideoTrack?.getInt("value") ?: 0
        view?.setSelectedVideoTrack(type, value)
    }

    @ReactProp(name = "viewType")
    override fun setViewType(view: GraniteVideoView?, viewType: String?) {
        view?.setUseTextureView(viewType == "texture")
    }

    @ReactProp(name = "useTextureView")
    override fun setUseTextureView(view: GraniteVideoView?, useTextureView: Boolean) {
        view?.setUseTextureView(useTextureView)
    }

    @ReactProp(name = "useSecureView")
    override fun setUseSecureView(view: GraniteVideoView?, useSecureView: Boolean) {
        view?.setUseSecureView(useSecureView)
    }

    @ReactProp(name = "shutterColor")
    override fun setShutterColor(view: GraniteVideoView?, shutterColor: String?) {
        shutterColor?.let {
            try {
                view?.setShutterColor(Color.parseColor(it))
            } catch (e: Exception) {
                // Invalid color
            }
        }
    }

    @ReactProp(name = "hideShutterView")
    override fun setHideShutterView(view: GraniteVideoView?, hideShutterView: Boolean) {
        view?.setHideShutterView(hideShutterView)
    }

    // Other props with default implementations
    @ReactProp(name = "poster")
    override fun setPoster(view: GraniteVideoView?, poster: String?) {}

    @ReactProp(name = "posterResizeMode")
    override fun setPosterResizeMode(view: GraniteVideoView?, posterResizeMode: String?) {}

    @ReactProp(name = "automaticallyWaitsToMinimizeStalling")
    override fun setAutomaticallyWaitsToMinimizeStalling(view: GraniteVideoView?, value: Boolean) {}

    @ReactProp(name = "preferredForwardBufferDuration")
    override fun setPreferredForwardBufferDuration(view: GraniteVideoView?, value: Double) {}

    @ReactProp(name = "drm")
    override fun setDrm(view: GraniteVideoView?, drm: ReadableMap?) {}

    @ReactProp(name = "localSourceEncryptionKeyScheme")
    override fun setLocalSourceEncryptionKeyScheme(view: GraniteVideoView?, value: String?) {}

    @ReactProp(name = "adTagUrl")
    override fun setAdTagUrl(view: GraniteVideoView?, value: String?) {}

    @ReactProp(name = "adLanguage")
    override fun setAdLanguage(view: GraniteVideoView?, value: String?) {}

    @ReactProp(name = "showNotificationControls")
    override fun setShowNotificationControls(view: GraniteVideoView?, value: Boolean) {}

    @ReactProp(name = "disableFocus")
    override fun setDisableFocus(view: GraniteVideoView?, value: Boolean) {}

    @ReactProp(name = "disableDisconnectError")
    override fun setDisableDisconnectError(view: GraniteVideoView?, value: Boolean) {}

    @ReactProp(name = "focusable")
    override fun setFocusable(view: GraniteVideoView?, value: Boolean) {}

    @ReactProp(name = "preventsDisplaySleepDuringVideoPlayback")
    override fun setPreventsDisplaySleepDuringVideoPlayback(view: GraniteVideoView?, value: Boolean) {}

    @ReactProp(name = "fullscreenAutorotate")
    override fun setFullscreenAutorotate(view: GraniteVideoView?, value: Boolean) {}

    @ReactProp(name = "fullscreenOrientation")
    override fun setFullscreenOrientation(view: GraniteVideoView?, value: String?) {}

    @ReactProp(name = "contentStartTime")
    override fun setContentStartTime(view: GraniteVideoView?, value: Double) {}

    @ReactProp(name = "allowsExternalPlayback")
    override fun setAllowsExternalPlayback(view: GraniteVideoView?, value: Boolean) {}

    @ReactProp(name = "audioOutput")
    override fun setAudioOutput(view: GraniteVideoView?, value: String?) {}

    @ReactProp(name = "ignoreSilentSwitch")
    override fun setIgnoreSilentSwitch(view: GraniteVideoView?, value: String?) {}

    @ReactProp(name = "mixWithOthers")
    override fun setMixWithOthers(view: GraniteVideoView?, value: String?) {}

    @ReactProp(name = "enableDebug")
    override fun setEnableDebug(view: GraniteVideoView?, value: Boolean) {}

    @ReactProp(name = "enableDebugThread")
    override fun setEnableDebugThread(view: GraniteVideoView?, value: Boolean) {}

    // Commands
    override fun seek(view: GraniteVideoView?, time: Double, tolerance: Double) {
        view?.seekCommand(time, tolerance)
    }

    override fun adjustVolume(view: GraniteVideoView?, volume: Float) {
        view?.setVolumeCommand(volume)
    }

    override fun setFullScreen(view: GraniteVideoView?, fullscreen: Boolean) {
        view?.setFullScreenCommand(fullscreen)
    }

    override fun loadSource(view: GraniteVideoView?, uri: String?) {
        uri?.let { view?.setSourceCommand(it) }
    }

    override fun pause(view: GraniteVideoView?) {
        view?.pauseCommand()
    }

    override fun resume(view: GraniteVideoView?) {
        view?.resumeCommand()
    }

    override fun enterPictureInPicture(view: GraniteVideoView?) {
        view?.enterPictureInPictureCommand()
    }

    override fun exitPictureInPicture(view: GraniteVideoView?) {
        view?.exitPictureInPictureCommand()
    }

    // Event registration
    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        return MapBuilder.builder<String, Any>()
            .put("topVideoLoadStart", MapBuilder.of("registrationName", "onVideoLoadStart"))
            .put("topVideoLoad", MapBuilder.of("registrationName", "onVideoLoad"))
            .put("topVideoError", MapBuilder.of("registrationName", "onVideoError"))
            .put("topVideoProgress", MapBuilder.of("registrationName", "onVideoProgress"))
            .put("topVideoSeek", MapBuilder.of("registrationName", "onVideoSeek"))
            .put("topVideoEnd", MapBuilder.of("registrationName", "onVideoEnd"))
            .put("topVideoBuffer", MapBuilder.of("registrationName", "onVideoBuffer"))
            .put("topVideoBandwidthUpdate", MapBuilder.of("registrationName", "onVideoBandwidthUpdate"))
            .put("topVideoPlaybackStateChanged", MapBuilder.of("registrationName", "onVideoPlaybackStateChanged"))
            .put("topVideoPlaybackRateChange", MapBuilder.of("registrationName", "onVideoPlaybackRateChange"))
            .put("topVideoVolumeChange", MapBuilder.of("registrationName", "onVideoVolumeChange"))
            .put("topVideoIdle", MapBuilder.of("registrationName", "onVideoIdle"))
            .put("topVideoReadyForDisplay", MapBuilder.of("registrationName", "onVideoReadyForDisplay"))
            .put("topVideoAudioFocusChanged", MapBuilder.of("registrationName", "onVideoAudioFocusChanged"))
            .put("topVideoAudioBecomingNoisy", MapBuilder.of("registrationName", "onVideoAudioBecomingNoisy"))
            .put("topVideoFullscreenPlayerWillPresent", MapBuilder.of("registrationName", "onVideoFullscreenPlayerWillPresent"))
            .put("topVideoFullscreenPlayerDidPresent", MapBuilder.of("registrationName", "onVideoFullscreenPlayerDidPresent"))
            .put("topVideoFullscreenPlayerWillDismiss", MapBuilder.of("registrationName", "onVideoFullscreenPlayerWillDismiss"))
            .put("topVideoFullscreenPlayerDidDismiss", MapBuilder.of("registrationName", "onVideoFullscreenPlayerDidDismiss"))
            .put("topVideoPictureInPictureStatusChanged", MapBuilder.of("registrationName", "onVideoPictureInPictureStatusChanged"))
            .put("topVideoControlsVisibilityChange", MapBuilder.of("registrationName", "onVideoControlsVisibilityChange"))
            .put("topVideoAspectRatio", MapBuilder.of("registrationName", "onVideoAspectRatio"))
            .put("topTransferEnd", MapBuilder.of("registrationName", "onTransferEnd"))
            .build()
    }

    companion object {
        const val NAME = "GraniteVideoView"
    }
}
