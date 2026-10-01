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
import java.util.concurrent.atomic.AtomicBoolean

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
        val provider = providerResolver()
        if (provider == null) {
            Log.w(TAG, "No provider registered, cannot preload")
            promise.reject("NO_PROVIDER", "No provider registered, cannot preload")
            return
        }

        executor.execute {
            try {
                (provider as? ContextAwareGraniteImageProvider)?.initialize(reactApplicationContext.applicationContext)
                val json = JSONArray(sourcesJson)
                // Parse before starting requests so malformed input cannot settle the promise twice.
                val sources = (0 until json.length()).map { parsePreloadSource(json.getJSONObject(it)) }
                val totalCount = sources.size

                if (totalCount == 0) {
                    promise.resolve(null)
                    return@execute
                }

                val completedCount = AtomicInteger(0)
                val successCount = AtomicInteger(0)
                val failCount = AtomicInteger(0)

                for (i in 0 until totalCount) {
                    val preloadSource = sources[i]
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
            failCount.incrementAndGet()
            checkPreloadCompletion(completedCount, successCount, failCount, totalCount, promise)
            return
        }

        val completed = AtomicBoolean(false)
        val onComplete: (Boolean) -> Unit = { success ->
            if (completed.compareAndSet(false, true)) {
                if (success) successCount.incrementAndGet() else failCount.incrementAndGet()
                checkPreloadCompletion(completedCount, successCount, failCount, totalCount, promise)
            }
        }
        try {
            provider.loadImage(
                url = source.uri,
                imageView = null,
                contentMode = "cover",
                headers = source.headers,
                priority = source.priority,
                cachePolicy = source.cachePolicy,
                onProgress = null,
                onCompletion = { success, _, _, _ -> onComplete(success) }
            )
        } catch (e: Exception) {
            onComplete(false)
        }
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
            if (failCount.get() > 0) {
                promise.reject("PRELOAD_ERROR", "Failed to preload ${failCount.get()} of $totalCount images")
            } else {
                promise.resolve(null)
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
        try {
            providerResolver()?.clearMemoryCache(reactApplicationContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CACHE_ERROR", "Failed to clear image memory cache", e)
        }
    }

    @ReactMethod
    fun clearDiskCache(promise: Promise) {
        val provider = providerResolver()
        executor.execute {
            try {
                provider?.clearDiskCache(reactApplicationContext)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("CACHE_ERROR", "Failed to clear image disk cache", e)
            }
        }
    }

    override fun invalidate() {
        executor.shutdownNow()
        super.invalidate()
    }

    companion object {
        const val NAME = "GraniteImageModule"
        private const val TAG = "GraniteImageModule"
    }
}
