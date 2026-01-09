package run.granite.image

import android.content.Context
import android.graphics.Bitmap
import android.view.View
import android.widget.ImageView

/**
 * Priority levels for image loading
 */
enum class GraniteImagePriority {
    LOW, NORMAL, HIGH
}

/**
 * Cache policy for image loading
 */
enum class GraniteImageCachePolicy {
    MEMORY, DISK, NONE
}

/**
 * Progress callback
 */
typealias GraniteImageProgressCallback = (loaded: Long, total: Long) -> Unit

/**
 * Completion callback with image dimensions
 */
typealias GraniteImageCompletionCallback = (bitmap: Bitmap?, error: Exception?, width: Int, height: Int) -> Unit

/**
 * Interface that defines the contract for image loading providers.
 * Implementations can use any image loading library (OkHttp, Glide, Coil, etc.)
 */
interface GraniteImageProvider {
    /**
     * Creates and returns a new View that will be used to display the image.
     * The returned view should be capable of displaying images (typically ImageView).
     */
    fun createImageView(context: Context): View

    /**
     * Loads an image from the given URL into the provided view.
     * @param url The URL string of the image to load
     * @param view The view returned from createImageView where the image should be displayed
     * @param scaleType The scale type to use when displaying the image
     */
    fun loadImage(url: String, into: View, scaleType: ImageView.ScaleType)

    /**
     * Cancels any ongoing image load for the given view.
     * @param view The view whose image load should be cancelled
     */
    fun cancelLoad(view: View)

    /**
     * Loads an image with full options support including headers, priority, cache policy, and callbacks.
     * Default implementation delegates to simple loadImage.
     */
    fun loadImage(
        url: String,
        into: View?,
        scaleType: ImageView.ScaleType,
        headers: Map<String, String>?,
        priority: GraniteImagePriority,
        cachePolicy: GraniteImageCachePolicy,
        defaultSource: String?,
        progressCallback: GraniteImageProgressCallback?,
        completionCallback: GraniteImageCompletionCallback?
    ) {
        if (into != null) {
            // Default implementation - just use simple load
            loadImage(url, into, scaleType)
        }
        // Notify completion with unknown dimensions
        completionCallback?.invoke(null, null, 0, 0)
    }

    /**
     * Preloads an image without displaying it.
     * Uses the extended loadImage with null view.
     */
    fun loadImage(
        url: String,
        imageView: Nothing?,
        contentMode: String,
        headers: Map<String, String>?,
        priority: GraniteImagePriority,
        cachePolicy: GraniteImageCachePolicy,
        onProgress: GraniteImageProgressCallback?,
        onCompletion: ((success: Boolean, width: Int, height: Int, error: String?) -> Unit)?
    ) {
        // Default implementation does nothing for preload
        onCompletion?.invoke(false, 0, 0, "Provider does not support preloading")
    }

    /**
     * Applies a tint color to the image view.
     * Default implementation does nothing.
     */
    fun applyTintColor(color: Int, view: View) {
        // Default implementation - do nothing
    }
}
