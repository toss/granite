package run.granite.lottie

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.GraniteLottieViewManagerInterface
import com.facebook.react.viewmanagers.GraniteLottieViewManagerDelegate

@ReactModule(name = GraniteLottieViewManager.NAME)
class GraniteLottieViewManager : SimpleViewManager<GraniteLottieView>(),
    GraniteLottieViewManagerInterface<GraniteLottieView> {

    private val delegate: ViewManagerDelegate<GraniteLottieView> =
        GraniteLottieViewManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<GraniteLottieView> = delegate

    override fun getName(): String = NAME

    override fun createViewInstance(context: ThemedReactContext): GraniteLottieView {
        return GraniteLottieView(context)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        return mapOf(
            "onAnimationLoaded" to mapOf("registrationName" to "onAnimationLoaded"),
            "onAnimationFinish" to mapOf("registrationName" to "onAnimationFinish"),
            "onAnimationFailure" to mapOf("registrationName" to "onAnimationFailure"),
            "onAnimationLoop" to mapOf("registrationName" to "onAnimationLoop")
        )
    }

    // Source props
    @ReactProp(name = "sourceName")
    override fun setSourceName(view: GraniteLottieView, value: String?) {
        view.setSourceName(value)
    }

    @ReactProp(name = "sourceJson")
    override fun setSourceJson(view: GraniteLottieView, value: String?) {
        view.setSourceJson(value)
    }

    @ReactProp(name = "sourceURL")
    override fun setSourceURL(view: GraniteLottieView, value: String?) {
        view.setSourceURL(value)
    }

    @ReactProp(name = "sourceDotLottieURI")
    override fun setSourceDotLottieURI(view: GraniteLottieView, value: String?) {
        view.setSourceDotLottieURI(value)
    }

    // Animation control props
    @ReactProp(name = "progress")
    override fun setProgress(view: GraniteLottieView, value: Float) {
        view.setProgress(value)
    }

    @ReactProp(name = "speed")
    override fun setSpeed(view: GraniteLottieView, value: Double) {
        view.setSpeed(value)
    }

    @ReactProp(name = "loop", defaultBoolean = true)
    override fun setLoop(view: GraniteLottieView, value: Boolean) {
        view.setLoop(value)
    }

    @ReactProp(name = "autoPlay", defaultBoolean = false)
    override fun setAutoPlay(view: GraniteLottieView, value: Boolean) {
        view.setAutoPlay(value)
    }

    // Layout & Rendering props
    @ReactProp(name = "resizeMode")
    override fun setResizeMode(view: GraniteLottieView, value: String?) {
        view.setResizeMode(value)
    }

    @ReactProp(name = "renderMode")
    override fun setRenderMode(view: GraniteLottieView, value: String?) {
        view.setRenderMode(value)
    }

    @ReactProp(name = "imageAssetsFolder")
    override fun setImageAssetsFolder(view: GraniteLottieView, value: String?) {
        view.setImageAssetsFolder(value)
    }

    // Android-specific props
    @ReactProp(name = "enableMergePathsAndroidForKitKatAndAbove", defaultBoolean = false)
    override fun setEnableMergePathsAndroidForKitKatAndAbove(view: GraniteLottieView, value: Boolean) {
        view.setEnableMergePathsAndroidForKitKatAndAbove(value)
    }

    @ReactProp(name = "enableSafeModeAndroid", defaultBoolean = false)
    override fun setEnableSafeModeAndroid(view: GraniteLottieView, value: Boolean) {
        view.setEnableSafeModeAndroid(value)
    }

    @ReactProp(name = "hardwareAccelerationAndroid", defaultBoolean = false)
    override fun setHardwareAccelerationAndroid(view: GraniteLottieView, value: Boolean) {
        view.setHardwareAccelerationAndroid(value)
    }

    @ReactProp(name = "cacheComposition", defaultBoolean = true)
    override fun setCacheComposition(view: GraniteLottieView, value: Boolean) {
        view.setCacheComposition(value)
    }

    // Filter props
    @ReactProp(name = "colorFilters")
    override fun setColorFilters(view: GraniteLottieView, value: ReadableArray?) {
        val filters = value?.let { array ->
            (0 until array.size()).mapNotNull { i ->
                array.getMap(i)?.let { map ->
                    mapOf(
                        "keypath" to (map.getString("keypath") ?: ""),
                        "color" to (map.getString("color") ?: "")
                    )
                }
            }
        }
        view.setColorFilters(filters)
    }

    @ReactProp(name = "textFiltersAndroid")
    override fun setTextFiltersAndroid(view: GraniteLottieView, value: ReadableArray?) {
        val filters = value?.let { array ->
            (0 until array.size()).mapNotNull { i ->
                array.getMap(i)?.let { map ->
                    mapOf(
                        "find" to (map.getString("find") ?: ""),
                        "replace" to (map.getString("replace") ?: "")
                    )
                }
            }
        }
        view.setTextFiltersAndroid(filters)
    }

    @ReactProp(name = "textFiltersIOS")
    override fun setTextFiltersIOS(view: GraniteLottieView, value: ReadableArray?) {
        // iOS only - no-op on Android
    }

    // Commands
    override fun play(view: GraniteLottieView, startFrame: Int, endFrame: Int) {
        view.play(startFrame, endFrame)
    }

    override fun pause(view: GraniteLottieView) {
        view.pause()
    }

    override fun resume(view: GraniteLottieView) {
        view.resume()
    }

    override fun reset(view: GraniteLottieView) {
        view.reset()
    }

    override fun onDropViewInstance(view: GraniteLottieView) {
        view.dispose()
        super.onDropViewInstance(view)
    }

    companion object {
        const val NAME = "GraniteLottieView"
    }
}
