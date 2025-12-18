package com.anthropic.reactnativegranitevideo

import android.graphics.Color
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.GraniteVideoViewManagerInterface
import com.facebook.react.viewmanagers.GraniteVideoViewManagerDelegate
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.events.EventDispatcher
import com.anthropic.reactnativegranitevideo.provider.*

@ReactModule(name = GraniteVideoViewManager.NAME)
class GraniteVideoViewManager : SimpleViewManager<GraniteVideoView>(),
    GraniteVideoViewManagerInterface<GraniteVideoView> {

    private val mDelegate: ViewManagerDelegate<GraniteVideoView> = GraniteVideoViewManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<GraniteVideoView> = mDelegate

    override fun getName(): String = NAME

    override fun createViewInstance(context: ThemedReactContext): GraniteVideoView {
        val view = GraniteVideoView(context)

        // Set up event listener
        view.eventListener = object : GraniteVideoEventListener {
            override fun onLoadStart(isNetwork: Boolean, type: String, uri: String) {
                val event = GraniteVideoEvents.createLoadStartEvent(view.id, isNetwork, type, uri)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoLoadStart", event)
            }

            override fun onLoad(data: GraniteVideoLoadData) {
                val event = GraniteVideoEvents.createLoadEvent(view.id, data)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoLoad", event)
            }

            override fun onError(error: GraniteVideoErrorData) {
                val event = GraniteVideoEvents.createErrorEvent(view.id, error)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoError", event)
            }

            override fun onProgress(data: GraniteVideoProgressData) {
                val event = GraniteVideoEvents.createProgressEvent(view.id, data)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoProgress", event)
            }

            override fun onSeek(currentTime: Double, seekTime: Double) {
                val event = GraniteVideoEvents.createSeekEvent(view.id, currentTime, seekTime)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoSeek", event)
            }

            override fun onEnd() {
                val event = GraniteVideoEvents.createEmptyEvent(view.id)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoEnd", event)
            }

            override fun onBuffer(isBuffering: Boolean) {
                val event = GraniteVideoEvents.createBufferEvent(view.id, isBuffering)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoBuffer", event)
            }

            override fun onBandwidthUpdate(bitrate: Double, width: Int, height: Int) {
                val event = GraniteVideoEvents.createBandwidthEvent(view.id, bitrate, width, height)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoBandwidthUpdate", event)
            }

            override fun onPlaybackStateChanged(isPlaying: Boolean, isSeeking: Boolean, isLooping: Boolean) {
                val event = GraniteVideoEvents.createPlaybackStateEvent(view.id, isPlaying, isSeeking, isLooping)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoPlaybackStateChanged", event)
            }

            override fun onPlaybackRateChange(rate: Float) {
                val event = GraniteVideoEvents.createPlaybackRateEvent(view.id, rate)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoPlaybackRateChange", event)
            }

            override fun onVolumeChange(volume: Float) {
                val event = GraniteVideoEvents.createVolumeEvent(view.id, volume)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoVolumeChange", event)
            }

            override fun onIdle() {
                val event = GraniteVideoEvents.createEmptyEvent(view.id)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoIdle", event)
            }

            override fun onReadyForDisplay() {
                val event = GraniteVideoEvents.createEmptyEvent(view.id)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoReadyForDisplay", event)
            }

            override fun onAudioFocusChanged(hasAudioFocus: Boolean) {
                val event = GraniteVideoEvents.createAudioFocusEvent(view.id, hasAudioFocus)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoAudioFocusChanged", event)
            }

            override fun onAudioBecomingNoisy() {
                val event = GraniteVideoEvents.createEmptyEvent(view.id)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoAudioBecomingNoisy", event)
            }

            override fun onFullscreenPlayerWillPresent() {
                val event = GraniteVideoEvents.createEmptyEvent(view.id)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoFullscreenPlayerWillPresent", event)
            }

            override fun onFullscreenPlayerDidPresent() {
                val event = GraniteVideoEvents.createEmptyEvent(view.id)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoFullscreenPlayerDidPresent", event)
            }

            override fun onFullscreenPlayerWillDismiss() {
                val event = GraniteVideoEvents.createEmptyEvent(view.id)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoFullscreenPlayerWillDismiss", event)
            }

            override fun onFullscreenPlayerDidDismiss() {
                val event = GraniteVideoEvents.createEmptyEvent(view.id)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoFullscreenPlayerDidDismiss", event)
            }

            override fun onPictureInPictureStatusChanged(isActive: Boolean) {
                val event = GraniteVideoEvents.createPipStatusEvent(view.id, isActive)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoPictureInPictureStatusChanged", event)
            }

            override fun onControlsVisibilityChanged(isVisible: Boolean) {
                val event = GraniteVideoEvents.createControlsVisibilityEvent(view.id, isVisible)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoControlsVisibilityChange", event)
            }

            override fun onAspectRatioChanged(width: Double, height: Double) {
                val event = GraniteVideoEvents.createAspectRatioEvent(view.id, width, height)
                context.getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "topVideoAspectRatio", event)
            }
        }

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
            .build()
    }

    companion object {
        const val NAME = "GraniteVideoView"
    }
}
