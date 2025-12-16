package com.graniteimage.providers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.drawable.Drawable
import android.util.Log
import android.view.View
import android.widget.ImageView
import com.graniteimage.GraniteImageProvider
import com.graniteimage.GraniteImagePriority
import com.graniteimage.GraniteImageCachePolicy
import com.graniteimage.GraniteImageProgressCallback
import com.graniteimage.GraniteImageCompletionCallback
import com.bumptech.glide.Glide
import com.bumptech.glide.load.DataSource
import com.bumptech.glide.load.engine.DiskCacheStrategy
import com.bumptech.glide.load.engine.GlideException
import com.bumptech.glide.load.model.GlideUrl
import com.bumptech.glide.load.model.LazyHeaders
import com.bumptech.glide.request.RequestListener
import com.bumptech.glide.request.target.Target
import com.bumptech.glide.Priority as GlidePriority

/**
 * GraniteImageProvider implementation using Glide.
 */
class GlideImageProvider : GraniteImageProvider {
    companion object {
        private const val TAG = "GlideImageProvider"
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

        // Build GlideUrl with headers if provided
        val glideUrl = if (headers != null && headers.isNotEmpty()) {
            val headersBuilder = LazyHeaders.Builder()
            headers.forEach { (key, value) ->
                headersBuilder.addHeader(key, value)
            }
            GlideUrl(url, headersBuilder.build())
        } else {
            GlideUrl(url)
        }

        val context = imageView?.context ?: return

        // Build request
        var requestBuilder = Glide.with(context)
            .asBitmap()
            .load(glideUrl)

        // Apply priority
        requestBuilder = when (priority) {
            GraniteImagePriority.LOW -> requestBuilder.priority(GlidePriority.LOW)
            GraniteImagePriority.NORMAL -> requestBuilder.priority(GlidePriority.NORMAL)
            GraniteImagePriority.HIGH -> requestBuilder.priority(GlidePriority.HIGH)
        }

        // Apply cache policy
        requestBuilder = when (cachePolicy) {
            GraniteImageCachePolicy.NONE -> requestBuilder.diskCacheStrategy(DiskCacheStrategy.NONE).skipMemoryCache(true)
            GraniteImageCachePolicy.MEMORY -> requestBuilder.diskCacheStrategy(DiskCacheStrategy.NONE)
            GraniteImageCachePolicy.DISK -> requestBuilder.diskCacheStrategy(DiskCacheStrategy.ALL)
        }

        // Apply default source (placeholder)
        if (!defaultSource.isNullOrEmpty()) {
            // Try to load as drawable resource first, then as URL
            val resourceId = context.resources.getIdentifier(defaultSource, "drawable", context.packageName)
            if (resourceId != 0) {
                requestBuilder = requestBuilder.placeholder(resourceId)
            }
        }

        // Add listener for completion callback
        requestBuilder = requestBuilder.listener(object : RequestListener<Bitmap> {
            override fun onLoadFailed(
                e: GlideException?,
                model: Any?,
                target: Target<Bitmap>,
                isFirstResource: Boolean
            ): Boolean {
                Log.e(TAG, "Error loading image: ${e?.message}")
                completionCallback?.invoke(null, e, 0, 0)
                return false
            }

            override fun onResourceReady(
                resource: Bitmap,
                model: Any,
                target: Target<Bitmap>?,
                dataSource: DataSource,
                isFirstResource: Boolean
            ): Boolean {
                val cacheTypeStr = when (dataSource) {
                    DataSource.MEMORY_CACHE -> "Memory"
                    DataSource.DATA_DISK_CACHE, DataSource.RESOURCE_DISK_CACHE -> "Disk"
                    else -> "Network"
                }
                Log.d(TAG, "Loaded with Glide ($cacheTypeStr): $url")
                completionCallback?.invoke(resource, null, resource.width, resource.height)
                return false
            }
        })

        requestBuilder.into(imageView)
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
}
