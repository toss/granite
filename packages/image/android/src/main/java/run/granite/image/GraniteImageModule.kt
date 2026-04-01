package run.granite.image

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

@ReactModule(name = GraniteImageModule.NAME)
class GraniteImageModule(
    reactContext: ReactApplicationContext,
    private val providerResolver: () -> GraniteImageProvider? = { GraniteImageRegistry.provider },
    private val executor: ExecutorService = Executors.newFixedThreadPool(4)
) : ReactContextBaseJavaModule(reactContext) {

    private data class PreloadSource(
        val uri: String,
        val headers: Map<String, String>?,
        val priority: GraniteImagePriority,
        val cachePolicy: GraniteImageCachePolicy
    )

    override fun getName(): String = NAME

    @ReactMethod
    fun preload(sourcesJson: String, promise: Promise) {
        Log.d(TAG, "preload called with: $sourcesJson")

        val provider = providerResolver()
        if (provider == null) {
            Log.w(TAG, "No provider registered, cannot preload")
            promise.reject("NO_PROVIDER", "No provider registered, cannot preload")
            return
        }

        executor.execute {
            try {
                val sources = JSONArray(sourcesJson)
                val totalCount = sources.length()

                if (totalCount == 0) {
                    promise.resolve(null)
                    return@execute
                }

                val completedCount = AtomicInteger(0)
                val successCount = AtomicInteger(0)
                val failCount = AtomicInteger(0)

                for (i in 0 until totalCount) {
                    val preloadSource = parsePreloadSource(sources.getJSONObject(i))
                    preloadSingle(provider, preloadSource, completedCount, successCount, failCount, totalCount, promise)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse sources JSON: ${e.message}")
                promise.reject("PARSE_ERROR", "Failed to parse sources JSON: ${e.message}")
            }
        }
    }

    private fun preloadSingle(
        provider: GraniteImageProvider,
        source: PreloadSource,
        completedCount: AtomicInteger,
        successCount: AtomicInteger,
        failCount: AtomicInteger,
        totalCount: Int,
        promise: Promise
    ) {
        if (source.uri.isEmpty()) {
            checkPreloadCompletion(completedCount, successCount, failCount, totalCount, promise)
            return
        }

        Log.d(TAG, "Preloading: ${source.uri}")
        provider.loadImage(
            url = source.uri,
            imageView = null,
            contentMode = "cover",
            headers = source.headers,
            priority = source.priority,
            cachePolicy = source.cachePolicy,
            onProgress = null,
            onCompletion = { success, width, height, error ->
                if (success) {
                    Log.d(TAG, "Preloaded successfully: ${source.uri} (${width}x${height})")
                    successCount.incrementAndGet()
                } else {
                    Log.d(TAG, "Preload failed for ${source.uri}: $error")
                    failCount.incrementAndGet()
                }
                checkPreloadCompletion(completedCount, successCount, failCount, totalCount, promise)
            }
        )
    }

    private fun checkPreloadCompletion(
        completedCount: AtomicInteger,
        successCount: AtomicInteger,
        failCount: AtomicInteger,
        totalCount: Int,
        promise: Promise
    ) {
        if (completedCount.incrementAndGet() == totalCount) {
            Log.d(TAG, "Preload completed: ${successCount.get()} succeeded, ${failCount.get()} failed")
            promise.resolve(null)
        }
    }

    private fun parsePreloadSource(source: JSONObject): PreloadSource {
        val uri = source.optString("uri", "")

        val headersObj = source.optJSONObject("headers")
        val headers = mutableMapOf<String, String>()
        headersObj?.let {
            val keys = it.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                headers[key] = it.getString(key)
            }
        }

        val priorityStr = source.optString("priority", "normal")
        val priority = GraniteImagePriority.fromString(priorityStr)

        // Module-side API uses FastImage-compatible names: "cacheOnly", "web"
        // (intentionally different from View-side API which uses "memory", "none")
        val cacheStr = source.optString("cache", "")
        val cachePolicy = when (cacheStr) {
            "cacheOnly" -> GraniteImageCachePolicy.DISK
            "web" -> GraniteImageCachePolicy.NONE
            else -> GraniteImageCachePolicy.DISK
        }

        return PreloadSource(
            uri = uri,
            headers = headers.ifEmpty { null },
            priority = priority,
            cachePolicy = cachePolicy
        )
    }

    @ReactMethod
    fun clearMemoryCache(promise: Promise) {
        Log.d(TAG, "clearMemoryCache called")
        val provider = providerResolver()
        val context = reactApplicationContext
        if (provider != null) {
            provider.clearMemoryCache(context)
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun clearDiskCache(promise: Promise) {
        Log.d(TAG, "clearDiskCache called")
        val provider = providerResolver()
        val context = reactApplicationContext
        if (provider != null) {
            provider.clearDiskCache(context)
        }
        promise.resolve(null)
    }

    companion object {
        const val NAME = "GraniteImageModule"
        private const val TAG = "GraniteImageModule"
    }
}
