package run.granite.image.providers

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.ImageView
import run.granite.image.GraniteImageProvider
import run.granite.image.GraniteImagePriority
import run.granite.image.GraniteImageCachePolicy
import run.granite.image.GraniteImageProgressCallback
import run.granite.image.GraniteImageCompletionCallback
import okhttp3.Call
import okhttp3.Callback
import okhttp3.CacheControl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * GraniteImageProvider implementation using OkHttp.
 * This is analogous to iOS's URLSessionImageProvider.
 */
class OkHttpImageProvider : GraniteImageProvider {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    private val activeCalls = ConcurrentHashMap<View, Call>()
    private val mainHandler = Handler(Looper.getMainLooper())

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
        // Allow null view for preloading
        val imageView: ImageView? = if (into != null) {
            if (into !is ImageView) {
                Log.e(TAG, "View is not an ImageView")
                completionCallback?.invoke(null, Exception("View is not an ImageView"), 0, 0)
                return
            }
            into.scaleType = scaleType
            // Cancel any existing request for this view
            cancelLoad(into)
            into
        } else {
            null
        }

        // Apply default source (placeholder) before loading
        if (imageView != null && !defaultSource.isNullOrEmpty()) {
            val resourceId = imageView.context.resources.getIdentifier(defaultSource, "drawable", imageView.context.packageName)
            if (resourceId != 0) {
                imageView.setImageResource(resourceId)
            }
        }

        val request = buildRequest(url, headers, cachePolicy)
        val call = client.newCall(request)
        if (into != null) {
            activeCalls[into] = call
        }

        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Error loading image: ${e.message}")
                if (into != null) {
                    activeCalls.remove(into)
                }
                mainHandler.post {
                    completionCallback?.invoke(null, e, 0, 0)
                }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (into != null) {
                        activeCalls.remove(into)
                    }
                    handleResponse(response, imageView, url, progressCallback, completionCallback)
                }
            }
        })
    }

    private fun buildRequest(
        url: String,
        headers: Map<String, String>?,
        cachePolicy: GraniteImageCachePolicy
    ): Request {
        val requestBuilder = Request.Builder().url(url)

        // Add headers
        headers?.forEach { (key, value) ->
            requestBuilder.addHeader(key, value)
        }

        // Apply cache policy
        when (cachePolicy) {
            GraniteImageCachePolicy.NONE -> {
                requestBuilder.cacheControl(CacheControl.FORCE_NETWORK)
            }
            GraniteImageCachePolicy.MEMORY, GraniteImageCachePolicy.DISK -> {
                // Use default caching
            }
        }

        return requestBuilder.build()
    }

    private fun handleResponse(
        response: Response,
        imageView: ImageView?,
        url: String,
        progressCallback: GraniteImageProgressCallback?,
        completionCallback: GraniteImageCompletionCallback?
    ) {
        if (!response.isSuccessful) {
            postError(Exception("HTTP error: ${response.code}"), completionCallback)
            return
        }

        val body = response.body
        if (body == null) {
            postError(Exception("No data received"), completionCallback)
            return
        }

        try {
            val imageBytes = readResponseBytes(body, progressCallback)
            val bitmap = decodeBitmap(imageBytes)
            if (bitmap == null) {
                postError(Exception("Failed to decode image data"), completionCallback)
                return
            }
            mainHandler.post {
                imageView?.setImageBitmap(bitmap)
                Log.d(TAG, "Loaded with OkHttp: $url")
                completionCallback?.invoke(bitmap, null, bitmap.width, bitmap.height)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading image data: ${e.message}")
            mainHandler.post { completionCallback?.invoke(null, e, 0, 0) }
        }
    }

    private fun readResponseBytes(
        body: okhttp3.ResponseBody,
        progressCallback: GraniteImageProgressCallback?
    ): ByteArray {
        val contentLength = body.contentLength()
        val inputStream = body.byteStream()
        val outputStream = ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        var totalBytesRead = 0L
        var bytesRead: Int
        while (inputStream.read(buffer).also { bytesRead = it } != -1) {
            outputStream.write(buffer, 0, bytesRead)
            totalBytesRead += bytesRead
            if (contentLength > 0) progressCallback?.invoke(totalBytesRead, contentLength)
        }
        return outputStream.toByteArray()
    }

    private fun decodeBitmap(imageBytes: ByteArray): Bitmap? {
        return BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
    }

    private fun postError(error: Exception, completionCallback: GraniteImageCompletionCallback?) {
        Log.e(TAG, error.message ?: "Unknown error")
        mainHandler.post { completionCallback?.invoke(null, error, 0, 0) }
    }

    override fun cancelLoad(view: View) {
        activeCalls[view]?.cancel()
        activeCalls.remove(view)
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
        // Preload implementation - load without displaying
        loadImage(
            url = url,
            into = null,
            scaleType = ImageView.ScaleType.CENTER_CROP,
            headers = headers,
            priority = priority,
            cachePolicy = cachePolicy,
            defaultSource = null,
            progressCallback = onProgress,
            completionCallback = { bitmap, error, width, height ->
                onCompletion?.invoke(bitmap != null, width, height, error?.message)
            }
        )
    }

    override fun clearMemoryCache(context: Context) {
        // OkHttp: no built-in memory cache — no-op
        Log.d(TAG, "Memory cache clear not supported (OkHttp)")
    }

    override fun clearDiskCache(context: Context) {
        // OkHttp: evict all if client.cache is configured
        try {
            client.cache?.evictAll()
            Log.d(TAG, "Disk cache cleared (OkHttp)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear disk cache: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "OkHttpImageProvider"
    }
}
