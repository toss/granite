package run.granite.image.providers

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.os.Looper
import android.widget.ImageView
import coil.ImageLoader
import coil.annotation.ExperimentalCoilApi
import coil.decode.DataSource
import coil.disk.DiskCache
import coil.fetch.DrawableResult
import coil.fetch.Fetcher
import coil.memory.MemoryCache
import coil.request.ImageRequest
import coil.request.Options
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.Collections
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okio.Buffer
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import run.granite.image.GraniteImageCachePolicy
import run.granite.image.GraniteImageCompletionCallback
import run.granite.image.GraniteImagePriority
import run.granite.image.GraniteImageProgressCallback
import run.granite.image.GraniteImagePackage
import run.granite.image.GraniteImageRegistry

@OptIn(ExperimentalCoilApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class CoilImageProviderTest {
    @get:Rule val temporary = TemporaryFolder()
    private val context: Context get() = RuntimeEnvironment.getApplication()
    private lateinit var server: MockWebServer
    private lateinit var loader: ImageLoader
    private lateinit var provider: CoilImageProvider
    private lateinit var png: ByteArray
    private val activities = mutableListOf<org.robolectric.android.controller.ActivityController<Activity>>()

    @Before fun setUp() {
        server = MockWebServer().also { it.start() }
        png = ByteArrayOutputStream().use { output ->
            Bitmap.createBitmap(12, 8, Bitmap.Config.ARGB_8888).apply { eraseColor(Color.RED) }
                .compress(Bitmap.CompressFormat.PNG, 100, output)
            output.toByteArray()
        }
        loader = ImageLoader.Builder(context)
            .allowHardware(false)
            .memoryCache { MemoryCache.Builder(context).maxSizeBytes(1024 * 1024).build() }
            .diskCache { DiskCache.Builder().directory(temporary.newFolder("cache")).maxSizeBytes(10L * 1024 * 1024).build() }
            .okHttpClient(OkHttpClient.Builder().addInterceptor(CoilImageProgressInterceptor()).build())
            .build()
        provider = CoilImageProvider(context, loader)
    }

    @After fun tearDown() {
        GraniteImageRegistry.clearProvider()
        activities.forEach { it.pause().stop().destroy() }
        loader.shutdown()
        server.shutdown()
    }

    @Test fun `preload before creating a view fills shared caches and preserves headers`() {
        server.enqueue(imageResponse())
        val url = server.url("/image.png").toString()
        var result: Boolean? = null
        provider.loadImage(url, null, "cover", mapOf("X-Test" to "value"), GraniteImagePriority.NORMAL,
            GraniteImageCachePolicy.DISK, null) { success, width, height, error ->
            assertNull(error)
            assertEquals(12, width)
            assertEquals(8, height)
            result = success
        }
        await { result != null }
        assertEquals(true, result)
        assertEquals("value", server.takeRequest(1, TimeUnit.SECONDS)!!.getHeader("X-Test"))
        assertTrue(loader.memoryCache!!.size > 0)
        assertNotNull(loader.diskCache!!.openSnapshot(url)?.use { it.data })
        val view = newView()
        var displayed = false
        load(url, view) { _, error, _, _ -> assertNull(error); displayed = true }
        await { displayed }
        assertEquals(1, server.requestCount)
        assertTrue(view.drawable is BitmapDrawable)
    }

    @Test fun `no arg provider can be initialized before preload`() {
        provider = CoilImageProvider()
        provider.initialize(context)
        server.enqueue(imageResponse())
        var done = false
        provider.loadImage(server.url("/initialized.png").toString(), null, "contain", null,
            GraniteImagePriority.NORMAL, GraniteImageCachePolicy.NONE, null) { success, _, _, error ->
            assertTrue(error, success)
            done = true
        }
        await { done }
    }

    @Test fun `memory and disk cache clear remove entries from the supplied loader`() {
        server.enqueue(imageResponse())
        val url = server.url("/cached.png").toString()
        var done = false
        load(url, newView()) { _, error, _, _ -> assertNull(error); done = true }
        await { done }
        assertTrue(loader.memoryCache!!.size > 0)
        assertNotNull(loader.diskCache!!.openSnapshot(url)?.use { it.data })
        provider.clearMemoryCache(context)
        provider.clearDiskCache(context)
        assertEquals(0, loader.memoryCache!!.size)
        assertNull(loader.diskCache!!.openSnapshot(url))
    }

    @Test fun `none and memory cache policies do not write to disk`() {
        for (policy in listOf(GraniteImageCachePolicy.NONE, GraniteImageCachePolicy.MEMORY)) {
            loader.memoryCache!!.clear()
            server.enqueue(imageResponse())
            val url = server.url("/$policy.png").toString()
            var done = false
            load(url, newView(), policy) { _, error, _, _ -> assertNull(error); done = true }
            await { done }
            assertNull(loader.diskCache!!.openSnapshot(url))
            assertEquals(policy == GraniteImageCachePolicy.MEMORY, loader.memoryCache!!.size > 0)
        }
    }

    @Test fun `HTTP and decoding failures reach the completion callback`() {
        for (response in listOf(MockResponse().setResponseCode(404), MockResponse().setBody("invalid image"))) {
            server.enqueue(response)
            var error: Exception? = null
            load(server.url("/bad-${server.requestCount}").toString(), newView()) { bitmap, failure, width, height ->
                assertNull(bitmap)
                assertEquals(0, width)
                assertEquals(0, height)
                error = failure
            }
            await { error != null }
        }
    }

    @Test fun `invalid headers fail through callbacks without throwing`() {
        var displayError: Exception? = null
        provider.loadImage("https://example.com/image.png", newView(), ImageView.ScaleType.FIT_CENTER,
            mapOf("Invalid\nName" to "value"), GraniteImagePriority.NORMAL, GraniteImageCachePolicy.DISK,
            null, null) { _, error, _, _ -> displayError = error }
        assertTrue(displayError is IllegalArgumentException)
        var preloadError: String? = null
        provider.loadImage("https://example.com/image.png", null, "cover", mapOf("Invalid\nName" to "value"),
            GraniteImagePriority.NORMAL, GraniteImageCachePolicy.DISK, null) { success, _, _, error ->
            assertFalse(success)
            preloadError = error
        }
        assertNotNull(preloadError)
        assertEquals(0, server.requestCount)
    }

    @Test fun `non Exception failures retain the original cause`() {
        val cause = AssertionError("decoder failed")
        val failingLoader = loader.newBuilder().components {
            add(object : Fetcher.Factory<Uri> {
                override fun create(data: Uri, options: Options, imageLoader: ImageLoader): Fetcher =
                    Fetcher { throw cause }
            })
        }.build()
        provider = CoilImageProvider(context, failingLoader)
        var error: Exception? = null
        load("https://example.com/broken.png", newView()) { _, failure, _, _ -> error = failure }
        await { error != null }
        // Coroutine stack-trace recovery may copy the throwable across suspension points.
        assertTrue(error!!.cause is AssertionError)
        assertEquals(cause.message, error!!.cause!!.message)
        failingLoader.shutdown()
    }

    @Test fun `non bitmap drawables remain drawable and report intrinsic dimensions`() {
        val drawable = object : ColorDrawable(Color.BLUE) {
            override fun getIntrinsicWidth() = 13
            override fun getIntrinsicHeight() = 7
        }
        val drawableLoader = loader.newBuilder().components {
            add(object : Fetcher.Factory<Uri> {
                override fun create(data: Uri, options: Options, imageLoader: ImageLoader): Fetcher =
                    Fetcher { DrawableResult(drawable, false, DataSource.MEMORY) }
            })
        }.build()
        provider = CoilImageProvider(context, drawableLoader)
        var done = false
        val view = newView()
        load("https://example.com/vector", view) { bitmap, error, width, height ->
            assertNull(bitmap)
            assertNull(error)
            assertEquals(13, width)
            assertEquals(7, height)
            done = true
        }
        await { done }
        assertSame(drawable, view.drawable)
        drawableLoader.shutdown()
    }

    @Test fun `file URI images do not require a network request`() {
        val file = temporary.newFile("local.png").apply { writeBytes(png) }
        var done = false
        load(Uri.fromFile(file).toString(), newView()) { _, error, width, height ->
            assertNull(error)
            assertEquals(12, width)
            assertEquals(8, height)
            done = true
        }
        await { done }
        assertEquals(0, server.requestCount)
    }

    @Test fun `default loader decodes SVG`() {
        provider = CoilImageProvider(context)
        server.enqueue(MockResponse().setHeader("Content-Type", "image/svg+xml").setBody(
            """<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8"><rect width="12" height="8" fill="red"/></svg>"""
        ))
        var done = false
        load(server.url("/image.svg").toString(), newView()) { _, error, width, height ->
            assertNull(error)
            assertTrue(width > 0 && height > 0)
            done = true
        }
        await { done }
    }

    @Test fun `default loader preserves animated GIF drawables`() {
        provider = CoilImageProvider(context)
        val hex = "47494638396101000100800000ff000000ff00" +
            "21ff0b4e45545343415045322e300301000000" +
            "21f904000a0000002c0000000001000100000202440100" +
            "21f904000a0000002c00000000010001000002024c01003b"
        val gif = hex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
        server.enqueue(MockResponse().setHeader("Content-Type", "image/gif").setBody(Buffer().write(gif)))
        val view = newView()
        var done = false
        load(server.url("/animated.gif").toString(), view) { bitmap, error, width, height ->
            assertNull(error)
            assertNull(bitmap)
            assertTrue(width > 0 && height > 0)
            done = true
        }
        await { done }
        assertTrue(view.drawable is android.graphics.drawable.Animatable)
    }

    @Test fun `package initializes a registered provider without replacing it`() {
        provider = CoilImageProvider()
        GraniteImageRegistry.registerProvider(provider)
        GraniteImagePackage.ensureProviderRegistered(context)
        assertSame(provider, GraniteImageRegistry.provider)
        server.enqueue(imageResponse())
        var done = false
        provider.loadImage(server.url("/registered.png").toString(), null, "cover", null,
            GraniteImagePriority.NORMAL, GraniteImageCachePolicy.NONE, null) { success, _, _, error ->
            assertTrue(error, success)
            done = true
        }
        await { done }
    }

    @Test fun `provider applies priority to queued HTTP requests`() {
        provider = CoilImageProvider(context, loader, maxConcurrentRequests = 1)
        server.enqueue(imageResponse().setBodyDelay(300, TimeUnit.MILLISECONDS))
        server.enqueue(imageResponse())
        server.enqueue(imageResponse())
        var completed = 0
        fun preload(name: String, priority: GraniteImagePriority) {
            provider.loadImage(server.url("/$name.png").toString(), null, "cover", null, priority,
                GraniteImageCachePolicy.DISK, null) { success, _, _, error ->
                assertTrue(error, success)
                completed++
            }
        }
        preload("active", GraniteImagePriority.NORMAL)
        await { server.requestCount == 1 }
        preload("low", GraniteImagePriority.LOW)
        preload("high", GraniteImagePriority.HIGH)
        await { completed == 3 }
        assertEquals(listOf("/active.png", "/high.png", "/low.png"),
            (1..3).map { server.takeRequest(1, TimeUnit.SECONDS)!!.path })
    }

    @Test fun `download progress counts bytes including chunked responses`() {
        for (chunked in listOf(false, true)) {
            val bytes = png + ByteArray(160_000)
            val response = MockResponse().setHeader("Content-Type", "image/png")
            val buffer = Buffer().write(bytes)
            if (chunked) response.setChunkedBody(buffer, 8192) else response.setBody(buffer)
            server.enqueue(response)
            val reports = Collections.synchronizedList(mutableListOf<Pair<Long, Long>>())
            var done = false
            load(server.url("/progress-$chunked.png").toString(), newView(), progress = { loaded, total ->
                reports.add(loaded to total)
            }) { _, error, _, _ -> assertNull(error); done = true }
            await { done }
            assertTrue(reports.size >= 2)
            assertEquals(bytes.size.toLong() to bytes.size.toLong(), reports.last())
            assertTrue(reports.zipWithNext().all { (a, b) -> a.first <= b.first })
        }
    }

    @Test fun `cancelling a request prevents its completion and stale drawable`() {
        server.enqueue(imageResponse().setBodyDelay(300, TimeUnit.MILLISECONDS))
        val view = newView()
        var oldCompletions = 0
        load(server.url("/old.png").toString(), view) { _, _, _, _ -> oldCompletions++ }
        await { server.requestCount == 1 }
        provider.cancelLoad(view)
        server.enqueue(imageResponse())
        var newDone = false
        load(server.url("/new.png").toString(), view) { _, error, _, _ -> assertNull(error); newDone = true }
        await { newDone }
        pumpFor(400)
        assertEquals(0, oldCompletions)
        assertTrue(view.drawable is BitmapDrawable)
    }

    private fun newView(): ImageView {
        val controller = Robolectric.buildActivity(Activity::class.java).setup()
        activities.add(controller)
        return (provider.createImageView(controller.get()) as ImageView).also {
            controller.get().setContentView(it)
            it.layout(0, 0, 40, 40)
        }
    }

    private fun load(
        url: String,
        view: ImageView,
        policy: GraniteImageCachePolicy = GraniteImageCachePolicy.DISK,
        progress: GraniteImageProgressCallback? = null,
        callback: GraniteImageCompletionCallback,
    ) = provider.loadImage(url, view, ImageView.ScaleType.FIT_CENTER, null, GraniteImagePriority.NORMAL,
        policy, null, progress, callback)

    private fun imageResponse() = MockResponse().setHeader("Content-Type", "image/png")
        .setHeader("Cache-Control", "max-age=3600").setBody(Buffer().write(png))

    private fun await(condition: () -> Boolean) {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15)
        while (!condition() && System.nanoTime() < deadline) {
            shadowOf(Looper.getMainLooper()).idle()
            Thread.sleep(10)
        }
        assertTrue("Timed out waiting for image request", condition())
    }

    private fun pumpFor(milliseconds: Long) {
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(milliseconds)
        while (System.nanoTime() < deadline) {
            shadowOf(Looper.getMainLooper()).idle()
            Thread.sleep(10)
        }
    }
}
