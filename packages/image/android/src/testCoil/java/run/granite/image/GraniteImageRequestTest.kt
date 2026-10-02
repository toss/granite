package run.granite.image

import android.view.View
import android.widget.ImageView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class GraniteImageRequestTest {
    @Test fun `all props are applied before the first request regardless of setter order`() {
        val provider = RecordingProvider()
        val view = GraniteImage(RuntimeEnvironment.getApplication()).apply { providerResolver = { provider } }
        view.setUri("https://example.com/image.png")
        view.setHeaders("""{"X-Test":"value"}""")
        view.setPriority("high")
        view.setCachePolicy("none")
        view.setDefaultSource("placeholder")
        assertEquals(0, provider.calls)
        view.commitUpdates()
        assertEquals(1, provider.calls)
        assertEquals(mapOf("X-Test" to "value"), provider.headers)
        assertEquals(GraniteImagePriority.HIGH, provider.priority)
        assertEquals(GraniteImageCachePolicy.NONE, provider.cachePolicy)
        assertEquals("placeholder", provider.defaultSource)
        view.commitUpdates()
        assertEquals(1, provider.calls)
    }

    @Test fun `changing headers at the same URI reloads and cancels the old request`() {
        val provider = RecordingProvider()
        val view = GraniteImage(RuntimeEnvironment.getApplication()).apply { providerResolver = { provider } }
        view.setUri("https://example.com/image.png")
        view.commitUpdates()
        view.setHeaders("""{"X-Test":"updated"}""")
        view.commitUpdates()
        assertEquals(2, provider.calls)
        assertEquals(1, provider.cancelled)
        assertEquals(mapOf("X-Test" to "updated"), provider.headers)
        view.cleanup()
        assertEquals(2, provider.cancelled)
    }

    private class RecordingProvider : GraniteImageProvider {
        var calls = 0
        var cancelled = 0
        var headers: Map<String, String>? = null
        var priority: GraniteImagePriority? = null
        var cachePolicy: GraniteImageCachePolicy? = null
        var defaultSource: String? = null
        override fun loadImage(url: String, into: View, scaleType: ImageView.ScaleType) {}
        override fun cancelLoad(view: View) { cancelled++ }
        override fun loadImage(url: String, into: View?, scaleType: ImageView.ScaleType, headers: Map<String, String>?,
            priority: GraniteImagePriority, cachePolicy: GraniteImageCachePolicy, defaultSource: String?,
            progressCallback: GraniteImageProgressCallback?, completionCallback: GraniteImageCompletionCallback?) {
            calls++
            this.headers = headers
            this.priority = priority
            this.cachePolicy = cachePolicy
            this.defaultSource = defaultSource
        }
    }
}
