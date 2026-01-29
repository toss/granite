package run.granite.video

import android.content.Context
import android.view.View
import io.mockk.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import run.granite.video.provider.*
import org.junit.Assert.*

/**
 * GraniteVideoView tests using Robolectric for Android view testing.
 * These tests require a real Android environment provided by Robolectric.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class GraniteVideoViewRobolectricTest {

    private lateinit var context: Context
    private lateinit var mockProvider: GraniteVideoProvider
    private lateinit var mockPlayerView: View
    private lateinit var mockEventListener: GraniteVideoEventListener

    @Before
    fun setUp() {
        context = RuntimeEnvironment.getApplication()
        mockProvider = mockk(relaxed = true)
        mockPlayerView = View(context)
        mockEventListener = mockk(relaxed = true)

        every { mockProvider.createPlayerView(any()) } returns mockPlayerView
        every { mockProvider.providerId } returns "test-provider"
        every { mockProvider.providerName } returns "Test Provider"

        GraniteVideoRegistry.clear()
    }

    @After
    fun tearDown() {
        clearAllMocks()
        GraniteVideoRegistry.clear()
    }

    // ============================================================
    // Initialization Tests
    // ============================================================

    @Test
    fun `view created with provider factory should use the provided factory`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        assertEquals(mockProvider, view.currentProvider)
    }

    @Test
    fun `view should set delegate on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        verify { mockProvider.delegate = view }
    }

    @Test
    fun `view should create player view on initialization`() {
        GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        verify { mockProvider.createPlayerView(context) }
    }

    @Test
    fun `view created with default provider from registry should use registry provider`() {
        GraniteVideoRegistry.registerFactory("default") { mockProvider }
        GraniteVideoRegistry.setDefaultProvider("default")

        val view = GraniteVideoView(context = context)

        assertEquals(mockProvider, view.currentProvider)
    }

    @Test
    fun `view created with no registry and no factory should have a fallback provider`() {
        val view = GraniteVideoView(context = context)

        assertNotNull(view.currentProvider)
    }

    // ============================================================
    // setSource Tests
    // ============================================================

    @Test
    fun `setSource with valid source should call loadSource on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        val source = mapOf(
            "uri" to "https://example.com/video.mp4",
            "type" to "mp4",
            "startPosition" to 10.0,
            "headers" to mapOf("Authorization" to "Bearer token")
        )
        view.setSource(source)

        verify {
            mockProvider.loadSource(match<GraniteVideoSource> {
                it.uri == "https://example.com/video.mp4" &&
                it.type == "mp4" &&
                it.startPosition == 10.0 &&
                it.headers?.get("Authorization") == "Bearer token"
            })
        }
    }

    @Test
    fun `setSource with null source should not call loadSource`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setSource(null)

        verify(exactly = 0) { mockProvider.loadSource(any()) }
    }

    @Test
    fun `setSource when not paused should call play after loading`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )
        view.setPaused(false)
        clearMocks(mockProvider, answers = false)
        every { mockProvider.createPlayerView(any()) } returns mockPlayerView

        view.setSource(mapOf("uri" to "https://example.com/video.mp4"))

        verifyOrder {
            mockProvider.loadSource(any())
            mockProvider.play()
        }
    }

    // ============================================================
    // Playback Control Tests
    // ============================================================

    @Test
    fun `setPaused(true) should call pause on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setPaused(true)

        verify { mockProvider.pause() }
    }

    @Test
    fun `setPaused(false) should call play on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setPaused(false)

        verify { mockProvider.play() }
    }

    @Test
    fun `setMuted should call setMuted on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setMuted(true)

        verify { mockProvider.setMuted(true) }
    }

    @Test
    fun `setVolume should call setVolume on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setVolume(0.5f)

        verify { mockProvider.setVolume(0.5f) }
    }

    @Test
    fun `setRate should call setRate on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setRate(1.5f)

        verify { mockProvider.setRate(1.5f) }
    }

    @Test
    fun `setRepeat should call setRepeat on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setRepeat(true)

        verify { mockProvider.setRepeat(true) }
    }

    @Test
    fun `seek should call seek on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.seek(30.0, 0.5)

        verify { mockProvider.seek(30.0, 0.5) }
    }

    // ============================================================
    // Resize Mode Tests
    // ============================================================

    @Test
    fun `setResizeMode cover should call setResizeMode with COVER`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setResizeMode("cover")

        verify { mockProvider.setResizeMode(GraniteVideoResizeMode.COVER) }
    }

    @Test
    fun `setResizeMode stretch should call setResizeMode with STRETCH`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setResizeMode("stretch")

        verify { mockProvider.setResizeMode(GraniteVideoResizeMode.STRETCH) }
    }

    @Test
    fun `setResizeMode none should call setResizeMode with NONE`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setResizeMode("none")

        verify { mockProvider.setResizeMode(GraniteVideoResizeMode.NONE) }
    }

    @Test
    fun `setResizeMode contain should call setResizeMode with CONTAIN`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setResizeMode("contain")

        verify { mockProvider.setResizeMode(GraniteVideoResizeMode.CONTAIN) }
    }

    // ============================================================
    // Controls Tests
    // ============================================================

    @Test
    fun `setControls should call setControlsEnabled on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setControls(true)

        verify { mockProvider.setControlsEnabled(true) }
    }

    @Test
    fun `setFullscreen should call setFullscreen on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setFullscreen(true)

        verify { mockProvider.setFullscreen(true, true) }
    }

    @Test
    fun `setPictureInPicture should call setPictureInPictureEnabled on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setPictureInPicture(true)

        verify { mockProvider.setPictureInPictureEnabled(true) }
    }

    // ============================================================
    // Buffer Config Tests
    // ============================================================

    @Test
    fun `setBufferConfig with valid config should call setBufferConfig on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        val config = mapOf(
            "minBufferMs" to 10000,
            "maxBufferMs" to 30000,
            "bufferForPlaybackMs" to 2000
        )
        view.setBufferConfig(config)

        verify {
            mockProvider.setBufferConfig(match<GraniteVideoBufferConfig> {
                it.minBufferMs == 10000 &&
                it.maxBufferMs == 30000 &&
                it.bufferForPlaybackMs == 2000
            })
        }
    }

    @Test
    fun `setBufferConfig with null should not call setBufferConfig`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setBufferConfig(null)

        verify(exactly = 0) { mockProvider.setBufferConfig(any()) }
    }

    // ============================================================
    // Delegate Events Tests
    // ============================================================

    @Test
    fun `onLoadStart should forward to eventListener`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )
        view.eventListener = mockEventListener

        view.onLoadStart(true, "mp4", "https://example.com/video.mp4")

        verify { mockEventListener.onLoadStart(true, "mp4", "https://example.com/video.mp4") }
    }

    @Test
    fun `onLoad should forward to eventListener`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )
        view.eventListener = mockEventListener

        val data = GraniteVideoLoadData(
            currentTime = 0.0,
            duration = 60.0,
            naturalWidth = 1920.0,
            naturalHeight = 1080.0,
            orientation = "landscape"
        )
        view.onLoad(data)

        verify { mockEventListener.onLoad(data) }
    }

    @Test
    fun `onError should forward to eventListener`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )
        view.eventListener = mockEventListener

        val error = GraniteVideoErrorData(
            code = 1001,
            domain = "ExoPlayer",
            localizedDescription = "Test error",
            errorString = "ERROR_TEST"
        )
        view.onError(error)

        verify { mockEventListener.onError(error) }
    }

    @Test
    fun `onProgress should forward to eventListener`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )
        view.eventListener = mockEventListener

        val data = GraniteVideoProgressData(
            currentTime = 10.0,
            playableDuration = 20.0,
            seekableDuration = 60.0
        )
        view.onProgress(data)

        verify { mockEventListener.onProgress(data) }
    }

    @Test
    fun `onEnd should forward to eventListener`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )
        view.eventListener = mockEventListener

        view.onEnd()

        verify { mockEventListener.onEnd() }
    }

    @Test
    fun `onBuffer should forward to eventListener`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )
        view.eventListener = mockEventListener

        view.onBuffer(true)

        verify { mockEventListener.onBuffer(true) }
    }

    @Test
    fun `onPlaybackStateChanged should forward to eventListener`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )
        view.eventListener = mockEventListener

        view.onPlaybackStateChanged(true, false, true)

        verify { mockEventListener.onPlaybackStateChanged(true, false, true) }
    }

    // ============================================================
    // Provider Selection Tests
    // ============================================================

    @Test
    fun `default provider set before view creation should be used`() {
        val mockProvider2 = mockk<GraniteVideoProvider>(relaxed = true)
        val mockPlayerView2 = View(context)
        every { mockProvider2.createPlayerView(any()) } returns mockPlayerView2
        every { mockProvider2.providerId } returns "provider2"

        GraniteVideoRegistry.registerFactory("provider1") { mockProvider }
        GraniteVideoRegistry.registerFactory("provider2") { mockProvider2 }
        GraniteVideoRegistry.setDefaultProvider("provider2")

        val view = GraniteVideoView(context = context)

        assertEquals(mockProvider2, view.currentProvider)
    }

    @Test
    fun `different default providers for different views`() {
        val mockProvider2 = mockk<GraniteVideoProvider>(relaxed = true)
        val mockPlayerView2 = View(context)
        every { mockProvider2.createPlayerView(any()) } returns mockPlayerView2
        every { mockProvider2.providerId } returns "provider2"

        GraniteVideoRegistry.registerFactory("provider1") { mockProvider }
        GraniteVideoRegistry.registerFactory("provider2") { mockProvider2 }

        GraniteVideoRegistry.setDefaultProvider("provider1")
        val view1 = GraniteVideoView(context = context)

        GraniteVideoRegistry.setDefaultProvider("provider2")
        val view2 = GraniteVideoView(context = context)

        assertEquals(mockProvider, view1.currentProvider)
        assertEquals(mockProvider2, view2.currentProvider)
    }

    // ============================================================
    // Commands Tests
    // ============================================================

    @Test
    fun `pauseCommand should call pause on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.pauseCommand()

        verify { mockProvider.pause() }
    }

    @Test
    fun `resumeCommand should call play on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.resumeCommand()

        verify { mockProvider.play() }
    }

    @Test
    fun `seekCommand should call seek on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.seekCommand(30.0, 0.1)

        verify { mockProvider.seek(30.0, 0.1) }
    }

    @Test
    fun `setVolumeCommand should call setVolume on provider`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setVolumeCommand(0.7f)

        verify { mockProvider.setVolume(0.7f) }
    }

    @Test
    fun `setSourceCommand should call loadSource with uri`() {
        val view = GraniteVideoView(
            context = context,
            providerFactory = { mockProvider }
        )

        view.setSourceCommand("https://example.com/video.mp4")

        verify {
            mockProvider.loadSource(match<GraniteVideoSource> {
                it.uri == "https://example.com/video.mp4"
            })
        }
    }
}
