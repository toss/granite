package run.granite.image.providers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.drawable.BitmapDrawable
import android.net.Uri
import android.util.Log
import android.view.View
import android.widget.ImageView
import run.granite.image.GraniteImageProvider
import run.granite.image.GraniteImagePriority
import run.granite.image.GraniteImageCachePolicy
import run.granite.image.GraniteImageProgressCallback
import run.granite.image.GraniteImageCompletionCallback
import coil.Coil
import coil.load
import coil.request.CachePolicy
import coil.request.ErrorResult
import coil.request.ImageRequest
import coil.request.SuccessResult

/**
 * GraniteImageProvider implementation using Coil.
 */
class CoilImageProvider : GraniteImageProvider {
    override fun loadImage(url: String, into: View, scaleType: ImageView.ScaleType) {
        loadImage(url, into, scaleType, null, GraniteImagePriority.NORMAL, GraniteImageCachePolicy.DISK, null, null, null)
    }

    private fun isValidImageUrl(url: String): Boolean {
        return try {
            val uri = Uri.parse(url)
            val scheme = uri.scheme?.lowercase()
            scheme == "http" || scheme == "https" || scheme == "file" || scheme == "content"
        } catch (e: Exception) {
            false
        }
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
        val imageView = validateImageView(into, scaleType, completionCallback) ?: return

        if (!isValidImageUrl(url)) {
            Log.e(TAG, "Invalid URL: $url")
            completionCallback?.invoke(null, Exception("Invalid URL: $url"), 0, 0)
            return
        }

        imageView.load(url) {
            headers?.forEach { (key, value) -> addHeader(key, value) }
            applyCachePolicy(cachePolicy)
            applyPlaceholder(imageView.context, defaultSource)
            listener(
                onStart = { Log.d(TAG, "Loading started: $url") },
                onSuccess = { _, result -> handleSuccess(result, url, completionCallback) },
                onError = { _, result -> handleError(result, completionCallback) }
            )
        }
    }

    private fun validateImageView(
        into: View?,
        scaleType: ImageView.ScaleType,
        completionCallback: GraniteImageCompletionCallback?
    ): ImageView? {
        if (into == null) {
            completionCallback?.invoke(null, Exception("No view provided"), 0, 0)
            return null
        }
        if (into !is ImageView) {
            Log.e(TAG, "View is not an ImageView")
            completionCallback?.invoke(null, Exception("View is not an ImageView"), 0, 0)
            return null
        }
        into.scaleType = scaleType
        return into
    }

    private fun ImageRequest.Builder.applyCachePolicy(cachePolicy: GraniteImageCachePolicy) {
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
    }

    private fun ImageRequest.Builder.applyPlaceholder(context: Context, defaultSource: String?) {
        if (!defaultSource.isNullOrEmpty()) {
            val resourceId = context.resources.getIdentifier(defaultSource, "drawable", context.packageName)
            if (resourceId != 0) placeholder(resourceId)
        }
    }

    private fun handleSuccess(
        result: SuccessResult,
        url: String,
        completionCallback: GraniteImageCompletionCallback?
    ) {
        val bitmap = (result.drawable as? BitmapDrawable)?.bitmap
        Log.d(TAG, "Loaded with Coil: $url")
        completionCallback?.invoke(bitmap, null, bitmap?.width ?: 0, bitmap?.height ?: 0)
    }

    private fun handleError(result: ErrorResult, completionCallback: GraniteImageCompletionCallback?) {
        Log.e(TAG, "Error loading image: ${result.throwable.message}")
        completionCallback?.invoke(null, result.throwable as? Exception, 0, 0)
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

    override fun clearMemoryCache(context: Context) {
        Coil.imageLoader(context).memoryCache?.clear()
        Log.d(TAG, "Memory cache cleared (Coil 2.x)")
    }

    override fun clearDiskCache(context: Context) {
        // Coil 2.x: no public API for diskCache — no-op
        Log.d(TAG, "Disk cache clear not supported (Coil 2.x)")
    }

    companion object {
        private const val TAG = "CoilImageProvider"
    }
}
