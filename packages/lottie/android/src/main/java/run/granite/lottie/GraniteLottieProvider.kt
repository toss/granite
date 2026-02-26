package run.granite.lottie

import android.content.Context
import android.view.View

/**
 * Priority level for animation loading
 */
enum class GraniteLottiePriority {
    LOW,
    NORMAL,
    HIGH
}

/**
 * Cache policy for animations
 */
enum class GraniteLottieCachePolicy {
    MEMORY,
    DISK,
    NONE
}

/**
 * Resize mode for animation view
 */
enum class GraniteLottieResizeMode {
    COVER,
    CONTAIN,
    CENTER;

    companion object {
        fun fromString(value: String?): GraniteLottieResizeMode {
            return when (value?.lowercase()) {
                "cover" -> COVER
                "center" -> CENTER
                else -> CONTAIN
            }
        }
    }
}

/**
 * Render mode for hardware acceleration
 */
enum class GraniteLottieRenderMode {
    AUTOMATIC,
    HARDWARE,
    SOFTWARE;

    companion object {
        fun fromString(value: String?): GraniteLottieRenderMode {
            return when (value?.uppercase()) {
                "HARDWARE" -> HARDWARE
                "SOFTWARE" -> SOFTWARE
                else -> AUTOMATIC
            }
        }
    }
}

/**
 * Color filter configuration
 */
data class GraniteLottieColorFilter(
    val keypath: String,
    val color: Int
)

/**
 * Text filter configuration for Android (find-and-replace)
 */
data class GraniteLottieTextFilter(
    val find: String,
    val replace: String
)

/**
 * Animation loading configuration
 */
data class GraniteLottieLoadConfig(
    var speed: Float = 1f,
    var loop: Boolean = true,
    var autoPlay: Boolean = false,
    var progress: Float = 0f,
    var resizeMode: GraniteLottieResizeMode = GraniteLottieResizeMode.CONTAIN,
    var renderMode: GraniteLottieRenderMode = GraniteLottieRenderMode.AUTOMATIC,
    var colorFilters: List<GraniteLottieColorFilter> = emptyList(),
    var textFilters: List<GraniteLottieTextFilter> = emptyList(),
    var cacheComposition: Boolean = true,
    var enableMergePaths: Boolean = false,
    var enableSafeMode: Boolean = false,
    var hardwareAcceleration: Boolean = false,
    var imageAssetsFolder: String? = null
)

/**
 * Listener for animation events
 */
interface GraniteLottieListener {
    fun onAnimationLoaded() {}
    fun onAnimationFinish(isCancelled: Boolean) {}
    fun onAnimationFailure(error: String) {}
    fun onAnimationLoop() {}
}

/**
 * Provider interface for Lottie animation implementations.
 * Implement this interface to provide custom animation rendering.
 */
interface GraniteLottieProvider {
    /**
     * Create a new animation view
     */
    fun createAnimationView(context: Context): View

    /**
     * Load animation from a local asset name
     */
    fun loadAnimation(assetName: String, view: View, config: GraniteLottieLoadConfig)

    /**
     * Load animation from a JSON string
     */
    fun loadAnimationFromJson(json: String, view: View, config: GraniteLottieLoadConfig)

    /**
     * Load animation from a remote URL
     */
    fun loadAnimationFromUrl(url: String, view: View, config: GraniteLottieLoadConfig)

    /**
     * Load .lottie file from URI
     */
    fun loadDotLottie(uri: String, view: View, config: GraniteLottieLoadConfig)

    /**
     * Set the listener for animation events
     */
    fun setListener(listener: GraniteLottieListener?, view: View)

    /**
     * Play animation
     * @param startFrame -1 means from current position
     * @param endFrame -1 means to end
     */
    fun play(view: View, startFrame: Int, endFrame: Int)

    /**
     * Pause animation
     */
    fun pause(view: View)

    /**
     * Resume animation
     */
    fun resume(view: View)

    /**
     * Reset animation to initial state
     */
    fun reset(view: View)

    /**
     * Set animation progress (0-1)
     */
    fun setProgress(progress: Float, view: View)

    /**
     * Set animation speed
     */
    fun setSpeed(speed: Float, view: View)

    /**
     * Set loop mode
     */
    fun setLoop(loop: Boolean, view: View)

    /**
     * Apply color filters
     */
    fun applyColorFilters(filters: List<GraniteLottieColorFilter>, view: View) {}

    /**
     * Apply text filters
     */
    fun applyTextFilters(filters: List<GraniteLottieTextFilter>, view: View) {}

    /**
     * Cancel any ongoing load operation
     */
    fun cancelLoad(view: View)
    fun disposeView(view: View)
}
