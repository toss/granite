package run.granite.lottie

import android.content.Context
import android.graphics.Color
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper

class GraniteLottieView(context: Context) : FrameLayout(context), GraniteLottieListener {
    private var containerView: View? = null
    private var provider: GraniteLottieProvider? = null
    private val config = GraniteLottieLoadConfig()

    // Current source state
    private var currentSourceName: String? = null
    private var currentSourceJson: String? = null
    private var currentSourceURL: String? = null
    private var currentDotLottieURI: String? = null

    // Animation state
    private var shouldAutoPlay = false
    private var isLoaded = false

    init {
        // ContentProvider auto-registers builtin provider when INCLUDE_DEFAULT_PROVIDER=true
        val resolvedProvider = GraniteLottieRegistry.createProvider()

        if (resolvedProvider == null) {
            Log.w(TAG, "No provider registered. Register a provider using GraniteLottieRegistry.")
        }

        provider = resolvedProvider

        // Create container view from provider
        provider?.let { p ->
            containerView = p.createAnimationView(context)
            containerView?.layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
            containerView?.let { addView(it) }

            // Set listener
            containerView?.let { p.setListener(this, it) }
        }
    }

    companion object {
        private const val TAG = "GraniteLottieView"
    }

    // Source setters - trigger reload
    fun setSourceName(name: String?) {
        if (provider == null) return
        if (name != null && name.isNotEmpty() && name != currentSourceName) {
            currentSourceName = name
            currentSourceJson = null
            currentSourceURL = null
            currentDotLottieURI = null
            loadAnimation()
        }
    }

    fun setSourceJson(json: String?) {
        if (provider == null) return
        if (json != null && json.isNotEmpty() && json != currentSourceJson) {
            currentSourceJson = json
            currentSourceName = null
            currentSourceURL = null
            currentDotLottieURI = null
            loadAnimation()
        }
    }

    fun setSourceURL(url: String?) {
        if (provider == null) return
        if (url != null && url.isNotEmpty() && url != currentSourceURL) {
            currentSourceURL = url
            currentSourceName = null
            currentSourceJson = null
            currentDotLottieURI = null
            loadAnimation()
        }
    }

    fun setSourceDotLottieURI(uri: String?) {
        if (provider == null) return
        if (uri != null && uri.isNotEmpty() && uri != currentDotLottieURI) {
            currentDotLottieURI = uri
            currentSourceName = null
            currentSourceJson = null
            currentSourceURL = null
            loadAnimation()
        }
    }

    // Animation control - in-place update
    fun setSpeed(speed: Double) {
        config.speed = speed.toFloat()
        if (isLoaded) {
            containerView?.let { provider?.setSpeed(speed.toFloat(), it) }
        }
    }

    fun setLoop(loop: Boolean) {
        config.loop = loop
        if (isLoaded) {
            containerView?.let { provider?.setLoop(loop, it) }
        }
    }

    fun setAutoPlay(autoPlay: Boolean) {
        shouldAutoPlay = autoPlay
        config.autoPlay = autoPlay
        if (autoPlay && isLoaded) {
            containerView?.let { provider?.play(it, -1, -1) }
        }
    }

    fun setProgress(progress: Float) {
        config.progress = progress
        if (isLoaded) {
            containerView?.let { provider?.setProgress(progress, it) }
        }
    }

    fun setResizeMode(mode: String?) {
        config.resizeMode = GraniteLottieResizeMode.fromString(mode)
    }

    fun setRenderMode(mode: String?) {
        config.renderMode = GraniteLottieRenderMode.fromString(mode)
    }

    fun setCacheComposition(cache: Boolean) {
        config.cacheComposition = cache
    }

    fun setEnableMergePathsAndroidForKitKatAndAbove(enable: Boolean) {
        config.enableMergePaths = enable
    }

    fun setEnableSafeModeAndroid(enable: Boolean) {
        config.enableSafeMode = enable
    }

    fun setHardwareAccelerationAndroid(enable: Boolean) {
        config.hardwareAcceleration = enable
    }

    fun setImageAssetsFolder(folder: String?) {
        config.imageAssetsFolder = folder
    }

    fun setColorFilters(filters: List<Map<String, Any>>?) {
        if (filters != null) {
            config.colorFilters = filters.mapNotNull { filter ->
                val keypath = filter["keypath"] as? String ?: return@mapNotNull null
                val colorStr = filter["color"] as? String ?: return@mapNotNull null
                val color = try {
                    Color.parseColor(colorStr)
                } catch (e: Exception) {
                    return@mapNotNull null
                }
                GraniteLottieColorFilter(keypath, color)
            }
            if (isLoaded) {
                containerView?.let { provider?.applyColorFilters(config.colorFilters, it) }
            }
        }
    }

    fun setTextFiltersAndroid(filters: List<Map<String, Any>>?) {
        if (filters != null) {
            config.textFilters = filters.mapNotNull { filter ->
                val find = filter["find"] as? String ?: return@mapNotNull null
                val replace = filter["replace"] as? String ?: return@mapNotNull null
                GraniteLottieTextFilter(find, replace)
            }
            if (isLoaded) {
                containerView?.let { provider?.applyTextFilters(config.textFilters, it) }
            }
        }
    }

    // Commands
    fun play(startFrame: Int, endFrame: Int) {
        containerView?.let { provider?.play(it, startFrame, endFrame) }
    }

    fun pause() {
        containerView?.let { provider?.pause(it) }
    }

    fun resume() {
        containerView?.let { provider?.resume(it) }
    }

    fun reset() {
        containerView?.let { provider?.reset(it) }
    }

    fun dispose() {
        containerView?.let { provider?.disposeView(it) }
    }

    private fun loadAnimation() {
        isLoaded = false
        val p = provider ?: return

        containerView?.let { view ->
            when {
                !currentSourceName.isNullOrEmpty() -> {
                    p.loadAnimation(currentSourceName!!, view, config)
                }
                !currentSourceJson.isNullOrEmpty() -> {
                    p.loadAnimationFromJson(currentSourceJson!!, view, config)
                }
                !currentSourceURL.isNullOrEmpty() -> {
                    p.loadAnimationFromUrl(currentSourceURL!!, view, config)
                }
                !currentDotLottieURI.isNullOrEmpty() -> {
                    p.loadDotLottie(currentDotLottieURI!!, view, config)
                }
            }
        }
    }

    // GraniteLottieListener implementation
    override fun onAnimationLoaded() {
        isLoaded = true
        emitEvent(GraniteLottieLoadedEvent(surfaceId, id))

        if (shouldAutoPlay) {
            containerView?.let { provider?.play(it, -1, -1) }
        }
    }

    override fun onAnimationFinish(isCancelled: Boolean) {
        emitEvent(GraniteLottieFinishEvent(surfaceId, id, isCancelled))
    }

    override fun onAnimationFailure(error: String) {
        emitEvent(GraniteLottieFailureEvent(surfaceId, id, error))
    }

    override fun onAnimationLoop() {
        emitEvent(GraniteLottieLoopEvent(surfaceId, id))
    }

    private val surfaceId: Int
        get() = UIManagerHelper.getSurfaceId(this)

    private fun emitEvent(event: com.facebook.react.uimanager.events.Event<*>) {
        val reactContext = context as? ReactContext ?: return
        UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)?.dispatchEvent(event)
    }
}
