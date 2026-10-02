package run.granite.image

import android.content.Context
import android.view.View
import android.widget.ImageView
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.AbstractExecutorService
import java.util.concurrent.TimeUnit
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.*
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class GraniteImageModuleTest {
    @Test fun `preload resolves failures and initializes a viewless provider`() {
        val provider = RecordingProvider(false)
        val promise = mock(Promise::class.java)
        module(provider).preload("""[{"uri":"https://example.com/image.png"}]""", promise)
        assertNotNull(provider.context)
        verify(promise).resolve(null)
        verifyNoMoreInteractions(promise)
    }

    @Test fun `preload skips missing and empty URIs and still resolves`() {
        val provider = RecordingProvider(false)
        val promise = mock(Promise::class.java)
        module(provider).preload("""[{},{"uri":""},{"uri":"https://example.com/image.png"}]""", promise)
        assertEquals(1, provider.calls)
        verify(promise).resolve(null)
        verifyNoMoreInteractions(promise)
    }

    @Test fun `mixed asynchronous preload results settle after the last callback`() {
        val callbacks = mutableListOf<((Boolean, Int, Int, String?) -> Unit)?>()
        val provider = object : GraniteImageProvider {
            override fun loadImage(url: String, into: View, scaleType: ImageView.ScaleType) {}
            override fun cancelLoad(view: View) {}
            override fun loadImage(url: String, imageView: Nothing?, contentMode: String, headers: Map<String, String>?,
                priority: GraniteImagePriority, cachePolicy: GraniteImageCachePolicy, onProgress: GraniteImageProgressCallback?,
                onCompletion: ((Boolean, Int, Int, String?) -> Unit)?) {
                callbacks.add(onCompletion)
            }
        }
        val promise = mock(Promise::class.java)
        module(provider).preload("""[{"uri":"https://example.com/one.png"},{"uri":"https://example.com/two.png"}]""", promise)
        verifyNoInteractions(promise)
        callbacks[0]?.invoke(false, 0, 0, "failed")
        callbacks[0]?.invoke(false, 0, 0, "duplicate")
        verifyNoInteractions(promise)
        callbacks[1]?.invoke(true, 12, 8, null)
        verify(promise).resolve(null)
        verifyNoMoreInteractions(promise)
    }

    @Test fun `preload waits for every request and resolves once`() {
        val provider = RecordingProvider(true)
        val promise = mock(Promise::class.java)
        module(provider).preload("""[{"uri":"https://example.com/one.png"},{"uri":"https://example.com/two.png"}]""", promise)
        assertEquals(2, provider.calls)
        verify(promise, times(1)).resolve(null)
        verifyNoMoreInteractions(promise)
    }

    @Test fun `malformed input starts no requests`() {
        val provider = RecordingProvider(true)
        val promise = mock(Promise::class.java)
        module(provider).preload("""[{"uri":"https://example.com/one.png"},0]""", promise)
        assertEquals(0, provider.calls)
        val invocation = mockingDetails(promise).invocations.single()
        assertEquals("reject", invocation.method.name)
        assertEquals("PARSE_ERROR", invocation.arguments[0])
    }

    @Test fun `duplicate completions cannot settle preload early`() {
        val provider = RecordingProvider(true, duplicate = true)
        val promise = mock(Promise::class.java)
        module(provider).preload("""[{"uri":"https://example.com/one.png"},{"uri":"https://example.com/two.png"}]""", promise)
        assertEquals(2, provider.calls)
        verify(promise, times(1)).resolve(null)
        verifyNoMoreInteractions(promise)
    }

    @Test fun `disk cache promise completes only after queued clearing`() {
        val provider = RecordingProvider(true)
        val promise = mock(Promise::class.java)
        val executor = TestExecutor(false)
        module(provider, executor).clearDiskCache(promise)
        verifyNoInteractions(promise)
        assertFalse(provider.diskCleared)
        executor.pending.single().run()
        assertTrue(provider.diskCleared)
        verify(promise).resolve(null)
    }

    private fun module(provider: GraniteImageProvider, executor: TestExecutor = TestExecutor()): GraniteImageModule {
        val context = mock(ReactApplicationContext::class.java)
        `when`(context.applicationContext).thenReturn(RuntimeEnvironment.getApplication())
        return GraniteImageModule(context, { provider }, executor)
    }

    private class RecordingProvider(val success: Boolean, val duplicate: Boolean = false) : GraniteImageProvider, ContextAwareGraniteImageProvider {
        var context: Context? = null
        var calls = 0
        var diskCleared = false
        override fun initialize(context: Context) { this.context = context }
        override fun loadImage(url: String, into: View, scaleType: ImageView.ScaleType) {}
        override fun cancelLoad(view: View) {}
        override fun clearDiskCache(context: Context) { diskCleared = true }
        override fun loadImage(url: String, imageView: Nothing?, contentMode: String, headers: Map<String, String>?,
            priority: GraniteImagePriority, cachePolicy: GraniteImageCachePolicy, onProgress: GraniteImageProgressCallback?,
            onCompletion: ((Boolean, Int, Int, String?) -> Unit)?) {
            calls++
            onCompletion?.invoke(success, 12, 8, if (success) null else "failed")
            if (duplicate) onCompletion?.invoke(success, 12, 8, null)
        }
    }

    private class TestExecutor(val immediate: Boolean = true) : AbstractExecutorService() {
        val pending = mutableListOf<Runnable>()
        override fun execute(command: Runnable) { if (immediate) command.run() else pending.add(command) }
        override fun shutdown() {}
        override fun shutdownNow(): MutableList<Runnable> = mutableListOf()
        override fun isShutdown() = false
        override fun isTerminated() = false
        override fun awaitTermination(timeout: Long, unit: TimeUnit) = true
    }
}
