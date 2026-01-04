package run.granite.image

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

@ReactModule(name = GraniteImageModule.NAME)
class GraniteImageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

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
                    val uri = source.optString("uri", "")
                    if (uri.isEmpty()) {
                        if (completedCount.incrementAndGet() == totalCount) {
                            Log.d(TAG, "Preload completed: ${successCount.get()} succeeded, ${failCount.get()} failed")
                            promise.resolve(null)
                        }
                        continue
                    }

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
                    val priority = when (priorityStr) {
                        "high" -> GraniteImagePriority.HIGH
                        "low" -> GraniteImagePriority.LOW
                        else -> GraniteImagePriority.NORMAL
                    }

                    val cacheStr = source.optString("cache", "")
                    val cachePolicy = when (cacheStr) {
                        "cacheOnly" -> GraniteImageCachePolicy.DISK
                        "web" -> GraniteImageCachePolicy.NONE
                        else -> GraniteImageCachePolicy.DISK
                    }

                    Log.d(TAG, "Preloading: $uri")

                    // Call provider's preload method (loadImage with null view for preload)
                    provider.loadImage(
                        url = uri,
                        imageView = null,
                        contentMode = "cover",
                        headers = headers.ifEmpty { null },
                        priority = priority,
                        cachePolicy = cachePolicy,
                        onProgress = null,
                        onCompletion = { success, width, height, error ->
                            if (success) {
                                Log.d(TAG, "Preloaded successfully: $uri (${width}x${height})")
                                successCount.incrementAndGet()
                            } else {
                                Log.d(TAG, "Preload failed for $uri: $error")
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

    @ReactMethod
    fun clearMemoryCache(promise: Promise) {
        Log.d(TAG, "clearMemoryCache called")
        // Memory cache clearing depends on provider implementation
        promise.resolve(null)
    }

    @ReactMethod
    fun clearDiskCache(promise: Promise) {
        Log.d(TAG, "clearDiskCache called")
        // Disk cache clearing depends on provider implementation
        promise.resolve(null)
    }
}
