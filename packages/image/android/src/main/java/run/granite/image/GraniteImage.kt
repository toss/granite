package run.granite.image

import android.content.Context
import android.graphics.Color
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.util.Log
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.EventDispatcher
import org.json.JSONObject

/**
 * Custom FrameLayout that serves as a container for the GraniteImage Fabric Component.
 * It delegates actual image loading to the registered GraniteImageProvider.
 */
class GraniteImage(context: Context) : FrameLayout(context) {
    companion object {
        private const val TAG = "GraniteImage"
    }

    private var containerView: View? = null
    private var currentUri: String? = null
    private var currentScaleType: ImageView.ScaleType = ImageView.ScaleType.CENTER_CROP

    // New properties
    private var currentHeaders: Map<String, String>? = null
    private var currentPriority: GraniteImagePriority = GraniteImagePriority.NORMAL
    private var currentCachePolicy: GraniteImageCachePolicy = GraniteImageCachePolicy.DISK
    private var currentTintColor: Int? = null
    private var currentDefaultSource: String? = null
    private var currentFallbackSource: String? = null

    init {
        Log.d(TAG, "GraniteImage initialized")
    }

    // Event dispatching methods using modern EventDispatcher
    private fun getEventDispatcher(): EventDispatcher? {
        val reactContext = context as? ReactContext ?: return null
        return UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
    }

    private fun emitLoadStart() {
        Log.d(TAG, "emitLoadStart")
        getEventDispatcher()?.dispatchEvent(
            GraniteImageLoadStartEvent(UIManagerHelper.getSurfaceId(this), id)
        )
    }

    private fun emitProgress(loaded: Int, total: Int) {
        Log.d(TAG, "emitProgress: $loaded / $total")
        getEventDispatcher()?.dispatchEvent(
            GraniteImageProgressEvent(UIManagerHelper.getSurfaceId(this), id, loaded, total)
        )
    }

    private fun emitLoad(width: Int, height: Int) {
        Log.d(TAG, "emitLoad: ${width}x${height}")
        getEventDispatcher()?.dispatchEvent(
            GraniteImageLoadEvent(UIManagerHelper.getSurfaceId(this), id, width, height)
        )
    }

    private fun emitError(error: String) {
        Log.d(TAG, "emitError: $error")
        getEventDispatcher()?.dispatchEvent(
            GraniteImageErrorEvent(UIManagerHelper.getSurfaceId(this), id, error)
        )
    }

    private fun emitLoadEnd() {
        Log.d(TAG, "emitLoadEnd")
        getEventDispatcher()?.dispatchEvent(
            GraniteImageLoadEndEvent(UIManagerHelper.getSurfaceId(this), id)
        )
    }

    fun setUri(uri: String?) {
        if (uri != currentUri) {
            currentUri = uri
            loadImageIfReady()
        }
    }

    fun setHeaders(headersJson: String?) {
        currentHeaders = headersJson?.let {
            try {
                val json = JSONObject(it)
                val map = mutableMapOf<String, String>()
                json.keys().forEach { key ->
                    map[key] = json.getString(key)
                }
                map
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse headers JSON: $e")
                null
            }
        }
    }

    fun setContentMode(contentMode: String?) {
        val newScaleType = when (contentMode) {
            "cover" -> ImageView.ScaleType.CENTER_CROP
            "contain" -> ImageView.ScaleType.FIT_CENTER
            "stretch" -> ImageView.ScaleType.FIT_XY
            "center" -> ImageView.ScaleType.CENTER
            else -> ImageView.ScaleType.CENTER_CROP
        }

        if (newScaleType != currentScaleType) {
            currentScaleType = newScaleType
            // Update scaleType in-place without reloading image
            (containerView as? ImageView)?.scaleType = newScaleType
        }
    }

    fun setPriority(priority: String?) {
        currentPriority = when (priority) {
            "low" -> GraniteImagePriority.LOW
            "high" -> GraniteImagePriority.HIGH
            else -> GraniteImagePriority.NORMAL
        }
    }

    fun setCachePolicy(cachePolicy: String?) {
        currentCachePolicy = when (cachePolicy) {
            "memory" -> GraniteImageCachePolicy.MEMORY
            "none" -> GraniteImageCachePolicy.NONE
            else -> GraniteImageCachePolicy.DISK
        }
    }

    fun setTintColor(color: Int?) {
        currentTintColor = color
        // Apply tint to existing image view if available
        if (color != null) {
            (containerView as? ImageView)?.let { imageView ->
                imageView.colorFilter = PorterDuffColorFilter(color, PorterDuff.Mode.SRC_IN)
            }
        }
    }

    fun setDefaultSource(source: String?) {
        currentDefaultSource = source
    }

    fun setFallbackSource(source: String?) {
        currentFallbackSource = source
    }

    private fun loadImageIfReady() {
        // Remove existing container view
        containerView?.let {
            removeView(it)
            containerView = null
        }

        val provider = GraniteImageRegistry.provider

        if (provider == null) {
            showErrorView("No GraniteImageProvider registered")
            emitError("No GraniteImageProvider registered")
            return
        }

        val uri = currentUri
        if (uri.isNullOrEmpty()) {
            showErrorView("No URI provided")
            emitError("No URI provided")
            return
        }

        // Emit load start event
        emitLoadStart()

        // Create new image view from provider
        val imageView = provider.createImageView(context)
        imageView.layoutParams = LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.MATCH_PARENT
        )
        addView(imageView)
        containerView = imageView

        // Load image using provider with full options
        provider.loadImage(
            url = uri,
            into = imageView,
            scaleType = currentScaleType,
            headers = currentHeaders,
            priority = currentPriority,
            cachePolicy = currentCachePolicy,
            defaultSource = currentDefaultSource,
            progressCallback = { loaded, total ->
                post {
                    emitProgress(loaded.toInt(), total.toInt())
                }
            },
            completionCallback = { bitmap, error, width, height ->
                post {
                    if (error != null) {
                        emitError(error.message ?: "Unknown error")

                        // Load fallback image if available
                        currentFallbackSource?.let { fallback ->
                            provider.loadImage(
                                url = fallback,
                                into = imageView,
                                scaleType = currentScaleType,
                                headers = null,
                                priority = GraniteImagePriority.HIGH,
                                cachePolicy = GraniteImageCachePolicy.DISK,
                                defaultSource = null,
                                progressCallback = null,
                                completionCallback = null
                            )
                        }
                    } else {
                        emitLoad(width, height)

                        // Apply tint color if set
                        currentTintColor?.let { color ->
                            provider.applyTintColor(color, imageView)
                        }
                    }
                    emitLoadEnd()
                }
            }
        )
    }

    private fun showErrorView(message: String) {
        Log.e(TAG, message)

        val errorView = FrameLayout(context).apply {
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.RED)
        }

        val label = TextView(context).apply {
            text = message
            setTextColor(Color.WHITE)
            textSize = 12f
            gravity = Gravity.CENTER
            layoutParams = LayoutParams(
                LayoutParams.WRAP_CONTENT,
                LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
            )
        }

        errorView.addView(label)
        addView(errorView)
        containerView = errorView
    }

    fun cleanup() {
        val provider = GraniteImageRegistry.provider
        containerView?.let {
            provider?.cancelLoad(it)
            removeView(it)
        }
        containerView = null
        currentUri = null
    }
}
