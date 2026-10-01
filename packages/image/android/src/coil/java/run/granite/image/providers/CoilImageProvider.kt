package run.granite.image.providers

import android.content.Context
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.view.View
import android.widget.ImageView
import coil.ImageLoader
import coil.annotation.ExperimentalCoilApi
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.decode.SvgDecoder
import coil.dispose
import coil.request.CachePolicy
import coil.request.ImageRequest
import coil.size.Scale
import okhttp3.OkHttpClient
import run.granite.image.ContextAwareGraniteImageProvider
import run.granite.image.GraniteImageCachePolicy
import run.granite.image.GraniteImageCompletionCallback
import run.granite.image.GraniteImagePriority
import run.granite.image.GraniteImageProgressCallback
import run.granite.image.GraniteImageProvider

/**
 * Reuses one loader for display, preload and cache management.
 * A supplied loader keeps its caches, networking configuration and decoders. Install
 * [CoilImageProgressInterceptor] on its HTTP client to receive download progress.
 */
class CoilImageProvider @JvmOverloads constructor(
    context: Context? = null,
    private val imageLoader: ImageLoader? = null,
    private val maxConcurrentRequests: Int = 6,
) : GraniteImageProvider, ContextAwareGraniteImageProvider {
    @Volatile private var applicationContext: Context? = null
    @Volatile private var loader: ImageLoader? = null

    init {
        require(maxConcurrentRequests > 0) { "maxConcurrentRequests must be positive" }
        context?.let(::initialize)
    }

    @Synchronized
    override fun initialize(context: Context) {
        if (loader != null) return
        val appContext = context.applicationContext
        val scheduler = CoilRequestScheduler(maxConcurrentRequests)
        val base = imageLoader
        applicationContext = appContext
        loader = if (base != null) {
            base.newBuilder()
                .components(base.components.newBuilder().add(scheduler).build())
                .build()
        } else {
            ImageLoader.Builder(appContext)
                .okHttpClient {
                    OkHttpClient.Builder().addInterceptor(CoilImageProgressInterceptor()).build()
                }
                .components {
                    add(scheduler)
                    if (Build.VERSION.SDK_INT >= 28) {
                        add(ImageDecoderDecoder.Factory())
                    } else {
                        add(GifDecoder.Factory())
                    }
                    add(SvgDecoder.Factory())
                }
                .build()
        }
    }

    override fun createImageView(context: Context): View {
        initialize(context)
        return ImageView(context)
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
        completionCallback: GraniteImageCompletionCallback?,
    ) {
        if (into !is ImageView) {
            completionCallback?.invoke(null, IllegalArgumentException("An ImageView is required"), 0, 0)
            return
        }
        initialize(into.context)
        into.scaleType = scaleType
        val progress = progressCallback?.let(::CoilImageProgress)
        val builder = try {
            request(into.context, url, headers, priority, cachePolicy, progress)
        } catch (error: Exception) {
            into.dispose()
            progress?.cancel()
            completionCallback?.invoke(null, error, 0, 0)
            return
        }
        val request = builder
            .target(into)
            .apply {
                if (!defaultSource.isNullOrEmpty()) {
                    val id = into.context.resources.getIdentifier(defaultSource, "drawable", into.context.packageName)
                    if (id != 0) placeholder(id)
                }
            }
            .listener(
                onCancel = { progress?.cancel() },
                onSuccess = { _, result ->
                    progress?.cancel()
                    complete(result.drawable, completionCallback)
                },
                onError = { _, result ->
                    progress?.cancel()
                    completionCallback?.invoke(null, result.throwable.asException(), 0, 0)
                },
            )
            .build()
        requireNotNull(loader).enqueue(request)
    }

    override fun loadImage(
        url: String,
        imageView: Nothing?,
        contentMode: String,
        headers: Map<String, String>?,
        priority: GraniteImagePriority,
        cachePolicy: GraniteImageCachePolicy,
        onProgress: GraniteImageProgressCallback?,
        onCompletion: ((success: Boolean, width: Int, height: Int, error: String?) -> Unit)?,
    ) {
        val context = applicationContext
        val currentLoader = loader
        if (context == null || currentLoader == null) {
            onCompletion?.invoke(false, 0, 0, "Initialize CoilImageProvider with an application context before preloading")
            return
        }
        val progress = onProgress?.let(::CoilImageProgress)
        val builder = try {
            request(context, url, headers, priority, cachePolicy, progress)
        } catch (error: Exception) {
            progress?.cancel()
            onCompletion?.invoke(false, 0, 0, error.message)
            return
        }
        val request = builder
            // Coil's default display-size resolver bounds decoding when there is no target view.
            .scale(if (contentMode == "cover") Scale.FILL else Scale.FIT)
            .listener(
                onCancel = {
                    progress?.cancel()
                    onCompletion?.invoke(false, 0, 0, "Image preload cancelled")
                },
                onSuccess = { _, result ->
                    progress?.cancel()
                    onCompletion?.invoke(
                        true,
                        result.drawable.intrinsicWidth.coerceAtLeast(0),
                        result.drawable.intrinsicHeight.coerceAtLeast(0),
                        null,
                    )
                },
                onError = { _, result ->
                    progress?.cancel()
                    onCompletion?.invoke(false, 0, 0, result.throwable.message ?: result.throwable.javaClass.simpleName)
                },
            )
            .build()
        currentLoader.enqueue(request)
    }

    private fun request(
        context: Context,
        url: String,
        headers: Map<String, String>?,
        priority: GraniteImagePriority,
        cachePolicy: GraniteImageCachePolicy,
        progress: CoilImageProgress?,
    ): ImageRequest.Builder = ImageRequest.Builder(context)
        .data(url.takeIf { it.isNotBlank() })
        .setParameter(CoilRequestScheduler.PRIORITY, priority, memoryCacheKey = null)
        .apply {
            headers?.forEach { (name, value) -> addHeader(name, value) }
            if (progress != null) tag(CoilImageProgress::class.java, progress)
            memoryCachePolicy(if (cachePolicy == GraniteImageCachePolicy.NONE) CachePolicy.DISABLED else CachePolicy.ENABLED)
            diskCachePolicy(if (cachePolicy == GraniteImageCachePolicy.DISK) CachePolicy.ENABLED else CachePolicy.DISABLED)
        }

    private fun complete(drawable: Drawable, callback: GraniteImageCompletionCallback?) {
        callback?.invoke(
            (drawable as? BitmapDrawable)?.bitmap,
            null,
            drawable.intrinsicWidth.coerceAtLeast(0),
            drawable.intrinsicHeight.coerceAtLeast(0),
        )
    }

    private fun Throwable.asException(): Exception = this as? Exception ?: Exception(message, this)

    override fun cancelLoad(view: View) {
        if (view is ImageView) view.dispose()
    }

    override fun applyTintColor(color: Int, view: View) {
        if (view is ImageView) view.colorFilter = PorterDuffColorFilter(color, PorterDuff.Mode.SRC_IN)
    }

    override fun clearMemoryCache(context: Context) {
        initialize(context)
        loader?.memoryCache?.clear()
    }

    @OptIn(ExperimentalCoilApi::class)
    override fun clearDiskCache(context: Context) {
        initialize(context)
        loader?.diskCache?.clear()
    }
}
