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
class GraniteImageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private data class PreloadSource(
        val uri: String,
        val headers: Map<String, String>?,
        val priority: GraniteImagePriority,
        val cachePolicy: GraniteImageCachePolicy
    )

    companion object {
        const val NAME = "GraniteImageModule"
        private const val TAG = "GraniteImageModule"
    }

    private val executor = Executors.newFixedThreadPool(4)

    override fun getName(): String = NAME

    @ReactMethod
    fun preload(sourcesJson: String, promise: Promise) {
        Log.d(TAG, "preload called with: $sourcesJson")

        val provider = GraniteImageRegistry.provider
        if (provider == null) {
            Log.w(TAG, "No provider registered, cannot preload")
            promise.reject("NO_PROVIDER", "No provider registered, cannot preload")
            return
        }

        executor.execute {
            try {
                val sources = JSONArray(sourcesJson)
                val totalCount = sources.length()
                val completedCount = AtomicInteger(0)
                val successCount = AtomicInteger(0)
                val failCount = AtomicInteger(0)

                if (totalCount == 0) {
                    promise.resolve(null)
                    return@execute
                }

                for (i in 0 until sources.length()) {
                    val source = sources.getJSONObject(i)
                    val preloadSource = parsePreloadSource(source)
                    if (preloadSource.uri.isEmpty()) {
                        if (completedCount.incrementAndGet() == totalCount) {
                            Log.d(TAG, "Preload completed: ${successCount.get()} succeeded, ${failCount.get()} failed")
                            promise.resolve(null)
                        }
                        continue
                    }

                    Log.d(TAG, "Preloading: ${preloadSource.uri}")

                    // Call provider's preload method (loadImage with null view for preload)
                    provider.loadImage(
                        url = preloadSource.uri,
                        imageView = null,
                        contentMode = "cover",
                        headers = preloadSource.headers,
                        priority = preloadSource.priority,
                        cachePolicy = preloadSource.cachePolicy,
                        onProgress = null,
                        onCompletion = { success, width, height, error ->
                            if (success) {
                                Log.d(TAG, "Preloaded successfully: ${preloadSource.uri} (${width}x${height})")
                                successCount.incrementAndGet()
                            } else {
                                Log.d(TAG, "Preload failed for ${preloadSource.uri}: $error")
                                failCount.incrementAndGet()
                            }
                            if (completedCount.incrementAndGet() == totalCount) {
                                Log.d(TAG, "Preload completed: ${successCount.get()} succeeded, ${failCount.get()} failed")
                                promise.resolve(null)
                            }
                        }
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse sources JSON: ${e.message}")
                promise.reject("PARSE_ERROR", "Failed to parse sources JSON: ${e.message}")
            }
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
        val provider = GraniteImageRegistry.provider
        val context = reactApplicationContext
        if (provider != null) {
            provider.clearMemoryCache(context)
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun clearDiskCache(promise: Promise) {
        Log.d(TAG, "clearDiskCache called")
        val provider = GraniteImageRegistry.provider
        val context = reactApplicationContext
        if (provider != null) {
            provider.clearDiskCache(context)
        }
        promise.resolve(null)
    }
}
