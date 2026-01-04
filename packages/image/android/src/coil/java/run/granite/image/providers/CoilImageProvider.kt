package run.granite.image.providers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.util.Log
import android.view.View
import android.widget.ImageView
import run.granite.image.GraniteImageProvider
import run.granite.image.GraniteImagePriority
import run.granite.image.GraniteImageCachePolicy
import run.granite.image.GraniteImageProgressCallback
import run.granite.image.GraniteImageCompletionCallback
import coil.load
import coil.request.CachePolicy
import coil.request.ErrorResult
import coil.request.SuccessResult

/**
 * GraniteImageProvider implementation using Coil.
 */
class CoilImageProvider : GraniteImageProvider {
    companion object {
        private const val TAG = "CoilImageProvider"
    }

    override fun createImageView(context: Context): View {
        return ImageView(context).apply {
            setBackgroundColor(android.graphics.Color.LTGRAY)
        }
    }

    override fun loadImage(url: String, into: View, scaleType: ImageView.ScaleType) {
        loadImage(url, into, scaleType, null, GraniteImagePriority.NORMAL, GraniteImageCachePolicy.DISK, null, null, null)
    }

    override fun loadImage(
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
        val imageView: ImageView? = if (into != null) {
            if (into !is ImageView) {
                Log.e(TAG, "View is not an ImageView")
                completionCallback?.invoke(null, Exception("View is not an ImageView"), 0, 0)
                return
            }
            into.scaleType = scaleType
            into
        } else {
            null
        }

        if (imageView == null) {
            completionCallback?.invoke(null, Exception("No view provided"), 0, 0)
            return
        }

        imageView.load(url) {
            // Add headers if provided
            headers?.forEach { (key, value) ->
                addHeader(key, value)
            }

            // Apply cache policy
            when (cachePolicy) {
                GraniteImageCachePolicy.NONE -> {
                    memoryCachePolicy(CachePolicy.DISABLED)
                    diskCachePolicy(CachePolicy.DISABLED)
                }
                GraniteImageCachePolicy.MEMORY -> {
                    memoryCachePolicy(CachePolicy.ENABLED)
                    diskCachePolicy(CachePolicy.DISABLED)
                }
                GraniteImageCachePolicy.DISK -> {
                    memoryCachePolicy(CachePolicy.ENABLED)
                    diskCachePolicy(CachePolicy.ENABLED)
                }
            }

            // Apply default source (placeholder)
            if (!defaultSource.isNullOrEmpty()) {
                val resourceId = imageView.context.resources.getIdentifier(defaultSource, "drawable", imageView.context.packageName)
                if (resourceId != 0) {
                    placeholder(resourceId)
                }
            }

            listener(
                onStart = {
                    Log.d(TAG, "Loading started: $url")
                },
                onSuccess = { _, result ->
                    val bitmap = (result.drawable as? android.graphics.drawable.BitmapDrawable)?.bitmap
                    val width = bitmap?.width ?: 0
                    val height = bitmap?.height ?: 0
                    Log.d(TAG, "Loaded with Coil: $url")
                    completionCallback?.invoke(bitmap, null, width, height)
                },
                onError = { _, result ->
                    Log.e(TAG, "Error loading image: ${result.throwable.message}")
                    completionCallback?.invoke(null, result.throwable as? Exception, 0, 0)
                }
            )
        }
    }

    override fun cancelLoad(view: View) {
        if (view is ImageView) {
            view.load(null as String?)
        }
    }

    override fun applyTintColor(color: Int, view: View) {
        if (view is ImageView) {
            view.colorFilter = PorterDuffColorFilter(color, PorterDuff.Mode.SRC_IN)
        }
    }

    override fun loadImage(
        url: String,
        imageView: Nothing?,
        contentMode: String,
        headers: Map<String, String>?,
        priority: GraniteImagePriority,
        cachePolicy: GraniteImageCachePolicy,
        onProgress: GraniteImageProgressCallback?,
        onCompletion: ((success: Boolean, width: Int, height: Int, error: String?) -> Unit)?
    ) {
        // Coil preload is not directly supported without a context
        onCompletion?.invoke(false, 0, 0, "Preload not supported without context")
    }
}
