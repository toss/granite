package run.granite.image.providers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.ImageView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.DataSource
import com.bumptech.glide.load.engine.DiskCacheStrategy
import com.bumptech.glide.load.engine.GlideException
import com.bumptech.glide.load.model.GlideUrl
import com.bumptech.glide.load.model.LazyHeaders
import com.bumptech.glide.request.RequestListener
import com.bumptech.glide.request.target.Target
import com.bumptech.glide.Priority as GlidePriority
import run.granite.image.GraniteImageProvider
import run.granite.image.GraniteImagePriority
import run.granite.image.GraniteImageCachePolicy
import run.granite.image.GraniteImageProgressCallback
import run.granite.image.GraniteImageCompletionCallback
import java.util.concurrent.Executors

/**
 * GraniteImageProvider implementation using Glide.
 */
class GlideImageProvider : GraniteImageProvider {
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
        val imageView = validateImageView(into, scaleType, completionCallback) ?: return
        val context = imageView.context ?: run {
            completionCallback?.invoke(null, Exception("Glide requires a view context for image loading"), 0, 0)
            return
        }

        val glideUrl = buildGlideUrl(url, headers)
        val requestBuilder = configureRequest(context, glideUrl, priority, cachePolicy, defaultSource)
            .listener(createRequestListener(url, completionCallback))

        requestBuilder.into(imageView)
    }

    private fun validateImageView(
        into: View?,
        scaleType: ImageView.ScaleType,
        completionCallback: GraniteImageCompletionCallback?
    ): ImageView? {
        if (into == null) return null
        if (into !is ImageView) {
            Log.e(TAG, "View is not an ImageView")
            completionCallback?.invoke(null, Exception("View is not an ImageView"), 0, 0)
            return null
        }
        into.scaleType = scaleType
        return into
    }

    private fun buildGlideUrl(url: String, headers: Map<String, String>?): GlideUrl {
        if (headers.isNullOrEmpty()) return GlideUrl(url)
        val headersBuilder = LazyHeaders.Builder()
        headers.forEach { (key, value) -> headersBuilder.addHeader(key, value) }
        return GlideUrl(url, headersBuilder.build())
    }

    private fun configureRequest(
        context: Context,
        glideUrl: GlideUrl,
        priority: GraniteImagePriority,
        cachePolicy: GraniteImageCachePolicy,
        defaultSource: String?
    ): com.bumptech.glide.RequestBuilder<Bitmap> {
        var builder = Glide.with(context).asBitmap().load(glideUrl)

        builder = when (priority) {
            GraniteImagePriority.LOW -> builder.priority(GlidePriority.LOW)
            GraniteImagePriority.NORMAL -> builder.priority(GlidePriority.NORMAL)
            GraniteImagePriority.HIGH -> builder.priority(GlidePriority.HIGH)
        }

        builder = when (cachePolicy) {
            GraniteImageCachePolicy.NONE -> builder.diskCacheStrategy(DiskCacheStrategy.NONE).skipMemoryCache(true)
            GraniteImageCachePolicy.MEMORY -> builder.diskCacheStrategy(DiskCacheStrategy.NONE)
            GraniteImageCachePolicy.DISK -> builder.diskCacheStrategy(DiskCacheStrategy.ALL)
        }

        if (!defaultSource.isNullOrEmpty()) {
            val resourceId = context.resources.getIdentifier(defaultSource, "drawable", context.packageName)
            if (resourceId != 0) builder = builder.placeholder(resourceId)
        }

        return builder
    }

    private fun createRequestListener(
        url: String,
        completionCallback: GraniteImageCompletionCallback?
    ): RequestListener<Bitmap> = object : RequestListener<Bitmap> {
        override fun onLoadFailed(
            e: GlideException?, model: Any?, target: Target<Bitmap>, isFirstResource: Boolean
        ): Boolean {
            Log.e(TAG, "Error loading image: ${e?.message}")
            completionCallback?.invoke(null, e, 0, 0)
            return false
        }

        override fun onResourceReady(
            resource: Bitmap, model: Any, target: Target<Bitmap>?, dataSource: DataSource, isFirstResource: Boolean
        ): Boolean {
            val cacheType = when (dataSource) {
                DataSource.MEMORY_CACHE -> "Memory"
                DataSource.DATA_DISK_CACHE, DataSource.RESOURCE_DISK_CACHE -> "Disk"
                else -> "Network"
            }
            Log.d(TAG, "Loaded with Glide ($cacheType): $url")
            completionCallback?.invoke(resource, null, resource.width, resource.height)
            return false
        }
    }

    override fun cancelLoad(view: View) {
        if (view is ImageView) {
            Glide.with(view.context).clear(view)
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
        // Glide preload is not directly supported without a context
        // This would need an Application context passed during initialization
        onCompletion?.invoke(false, 0, 0, "Preload not supported without context")
    }

    override fun clearMemoryCache(context: Context) {
        // Glide: clearMemory() must be called on the main thread
        if (Looper.myLooper() == Looper.getMainLooper()) {
            Glide.get(context).clearMemory()
        } else {
            Handler(Looper.getMainLooper()).post {
                Glide.get(context).clearMemory()
            }
        }
        Log.d(TAG, "Memory cache cleared (Glide)")
    }

    override fun clearDiskCache(context: Context) {
        // Glide: clearDiskCache() must be called on a background thread
        if (Looper.myLooper() != Looper.getMainLooper()) {
            Glide.get(context).clearDiskCache()
        } else {
            Executors.newSingleThreadExecutor().execute {
                Glide.get(context).clearDiskCache()
            }
        }
        Log.d(TAG, "Disk cache cleared (Glide)")
    }

    companion object {
        private const val TAG = "GlideImageProvider"
    }
}
