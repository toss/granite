package run.granite.video.provider

import android.content.Context
import android.view.SurfaceView
import android.view.TextureView
import android.view.View
import android.widget.FrameLayout
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.mockk.*
import run.granite.video.provider.factory.ExoPlayerFactory
import run.granite.video.provider.factory.MediaSourceFactory
import run.granite.video.provider.factory.TrackSelectorFactory
import run.granite.video.provider.factory.VideoSurfaceFactory
import run.granite.video.provider.scheduler.ProgressScheduler

class ExoPlayerProviderTest : FunSpec({

    lateinit var mockContext: Context
    lateinit var mockExoPlayer: ExoPlayer
    lateinit var mockExoPlayerFactory: ExoPlayerFactory
    lateinit var mockVideoSurfaceFactory: VideoSurfaceFactory
    lateinit var mockMediaSourceFactory: MediaSourceFactory
    lateinit var mockProgressScheduler: ProgressScheduler
    lateinit var mockTrackSelectorFactory: TrackSelectorFactory
    lateinit var mockTrackSelector: DefaultTrackSelector
    lateinit var mockDelegate: GraniteVideoDelegate
    lateinit var mockSurfaceView: SurfaceView
    lateinit var mockTextureView: TextureView
    lateinit var mockFrameLayout: FrameLayout
    lateinit var mockMediaSource: MediaSource

    lateinit var provider: ExoPlayerProvider

    beforeTest {
        mockContext = mockk(relaxed = true)
        mockExoPlayer = mockk(relaxed = true)
        mockExoPlayerFactory = mockk(relaxed = true)
        mockVideoSurfaceFactory = mockk(relaxed = true)
        mockMediaSourceFactory = mockk(relaxed = true)
        mockProgressScheduler = mockk(relaxed = true)
        mockTrackSelectorFactory = mockk(relaxed = true)
        mockTrackSelector = mockk(relaxed = true)
        mockDelegate = mockk(relaxed = true)
        mockSurfaceView = mockk(relaxed = true)
        mockTextureView = mockk(relaxed = true)
        mockFrameLayout = mockk(relaxed = true)
        mockMediaSource = mockk(relaxed = true)

        every { mockTrackSelectorFactory.create(any()) } returns mockTrackSelector
        every { mockExoPlayerFactory.create(any(), any()) } returns mockExoPlayer
        every { mockVideoSurfaceFactory.createSurfaceView(any()) } returns mockSurfaceView
        every { mockVideoSurfaceFactory.createTextureView(any()) } returns mockTextureView
        every { mockVideoSurfaceFactory.createContainer(any()) } returns mockFrameLayout
        every { mockMediaSourceFactory.create(any(), any()) } returns mockMediaSource
        every { mockExoPlayer.currentPosition } returns 5000L
        every { mockExoPlayer.duration } returns 60000L

        // Mock property setters
        every { mockExoPlayer.volume = any() } just Runs
        every { mockExoPlayer.repeatMode = any() } just Runs

        provider = ExoPlayerProvider(
            exoPlayerFactory = mockExoPlayerFactory,
            videoSurfaceFactory = mockVideoSurfaceFactory,
            mediaSourceFactory = mockMediaSourceFactory,
            progressScheduler = mockProgressScheduler,
            trackSelectorFactory = mockTrackSelectorFactory
        )
        provider.delegate = mockDelegate
    }

    afterTest {
        clearAllMocks()
    }

    // ============================================================
    // Provider Identification Tests
    // ============================================================

    test("providerId should be media3") {
        provider.providerId shouldBe "media3"
    }

    test("providerName should be Media3 ExoPlayer") {
        provider.providerName shouldBe "Media3 ExoPlayer"
    }

    // ============================================================
    // createPlayerView Tests
    // ============================================================

    test("createPlayerView should create container via factory") {
        provider.createPlayerView(mockContext)

        verify { mockVideoSurfaceFactory.createContainer(mockContext) }
    }

    test("createPlayerView should create ExoPlayer via factory") {
        provider.createPlayerView(mockContext)

        verify { mockExoPlayerFactory.create(eq(mockContext), any()) }
    }

    test("createPlayerView should create SurfaceView by default") {
        provider.createPlayerView(mockContext)

        verify { mockVideoSurfaceFactory.createSurfaceView(mockContext) }
    }

    test("createPlayerView should set video surface view on player") {
        provider.createPlayerView(mockContext)

        verify { mockExoPlayer.setVideoSurfaceView(mockSurfaceView) }
    }

    test("createPlayerView should return the container") {
        val view = provider.createPlayerView(mockContext)

        view shouldBe mockFrameLayout
    }

    test("createPlayerView with TextureView should create TextureView") {
        provider.setUseTextureView(true)
        provider.createPlayerView(mockContext)

        verify { mockVideoSurfaceFactory.createTextureView(mockContext) }
    }

    test("createPlayerView with TextureView should set video texture view on player") {
        provider.setUseTextureView(true)
        provider.createPlayerView(mockContext)

        verify { mockExoPlayer.setVideoTextureView(mockTextureView) }
    }

    // ============================================================
    // loadSource Tests
    // ============================================================

    test("loadSource should notify delegate of load start") {
        provider.createPlayerView(mockContext)

        val source = GraniteVideoSource(
            uri = "https://example.com/video.mp4",
            type = null,
            headers = mapOf("Authorization" to "Bearer token"),
            startPosition = 0.0
        )
        provider.loadSource(source)

        verify {
            mockDelegate.onLoadStart(
                isNetwork = true,
                type = any(),
                uri = "https://example.com/video.mp4"
            )
        }
    }

    test("loadSource should create media source via factory") {
        provider.createPlayerView(mockContext)

        val source = GraniteVideoSource(uri = "https://example.com/video.mp4")
        provider.loadSource(source)

        verify { mockMediaSourceFactory.create(source, any()) }
    }

    test("loadSource should set media source on player") {
        provider.createPlayerView(mockContext)

        val source = GraniteVideoSource(uri = "https://example.com/video.mp4")
        provider.loadSource(source)

        verify { mockExoPlayer.setMediaSource(mockMediaSource) }
    }

    test("loadSource should prepare player") {
        provider.createPlayerView(mockContext)

        val source = GraniteVideoSource(uri = "https://example.com/video.mp4")
        provider.loadSource(source)

        verify { mockExoPlayer.prepare() }
    }

    test("loadSource with start position should seek to position") {
        provider.createPlayerView(mockContext)

        val source = GraniteVideoSource(uri = "https://example.com/video.mp4", startPosition = 10.0)
        provider.loadSource(source)

        verify { mockExoPlayer.seekTo(10L) }
    }

    test("loadSource with null uri should not create media source") {
        provider.createPlayerView(mockContext)

        val source = GraniteVideoSource(uri = null)
        provider.loadSource(source)

        verify(exactly = 0) { mockMediaSourceFactory.create(any(), any()) }
    }

    // ============================================================
    // Playback Control Tests
    // ============================================================

    test("play should call play on ExoPlayer") {
        provider.createPlayerView(mockContext)

        provider.play()

        verify { mockExoPlayer.play() }
    }

    test("play should start progress updates") {
        provider.createPlayerView(mockContext)

        provider.play()

        verify { mockProgressScheduler.schedule(any(), any()) }
    }

    test("play should notify delegate of playback state change") {
        provider.createPlayerView(mockContext)

        provider.play()

        verify {
            mockDelegate.onPlaybackStateChanged(
                isPlaying = true,
                isSeeking = false,
                isLooping = any()
            )
        }
    }

    test("play should set isPlaying to true") {
        provider.createPlayerView(mockContext)

        provider.play()

        provider.isPlaying shouldBe true
    }

    test("pause should call pause on ExoPlayer") {
        provider.createPlayerView(mockContext)

        provider.pause()

        verify { mockExoPlayer.pause() }
    }

    test("pause should stop progress updates") {
        provider.createPlayerView(mockContext)

        provider.pause()

        verify { mockProgressScheduler.cancel() }
    }

    test("pause should set isPlaying to false") {
        provider.createPlayerView(mockContext)
        provider.play()

        provider.pause()

        provider.isPlaying shouldBe false
    }

    test("seek should seek ExoPlayer to position in milliseconds") {
        provider.createPlayerView(mockContext)

        provider.seek(30.0, 0.0)

        verify { mockExoPlayer.seekTo(30000L) }
    }

    test("seek should notify delegate of seek") {
        provider.createPlayerView(mockContext)

        provider.seek(30.0, 0.0)

        verify { mockDelegate.onSeek(any(), eq(30.0)) }
    }

    // ============================================================
    // Volume Control Tests
    // ============================================================

    test("setVolume should set volume on ExoPlayer") {
        provider.createPlayerView(mockContext)

        provider.setVolume(0.5f)

        verify { mockExoPlayer.volume = 0.5f }
    }

    test("setVolume should notify delegate of volume change") {
        provider.createPlayerView(mockContext)

        provider.setVolume(0.5f)

        verify { mockDelegate.onVolumeChange(0.5f) }
    }

    test("setMuted with true should set volume to 0") {
        provider.createPlayerView(mockContext)
        provider.setVolume(0.8f)

        provider.setMuted(true)

        verify { mockExoPlayer.volume = 0f }
    }

    test("setMuted with false should restore volume") {
        provider.createPlayerView(mockContext)
        provider.setVolume(0.8f)
        provider.setMuted(true)
        clearMocks(mockExoPlayer, answers = false)

        provider.setMuted(false)

        verify { mockExoPlayer.volume = 0.8f }
    }

    // ============================================================
    // Rate Control Tests
    // ============================================================

    test("setRate should set playback speed on ExoPlayer") {
        provider.createPlayerView(mockContext)

        provider.setRate(1.5f)

        verify { mockExoPlayer.setPlaybackSpeed(1.5f) }
    }

    test("setRate should notify delegate of rate change") {
        provider.createPlayerView(mockContext)

        provider.setRate(1.5f)

        verify { mockDelegate.onPlaybackRateChange(1.5f) }
    }

    // ============================================================
    // Repeat Control Tests
    // ============================================================

    test("setRepeat with true should set repeat mode to ONE") {
        provider.createPlayerView(mockContext)

        provider.setRepeat(true)

        verify { mockExoPlayer.repeatMode = Player.REPEAT_MODE_ONE }
    }

    test("setRepeat with false should set repeat mode to OFF") {
        provider.createPlayerView(mockContext)

        provider.setRepeat(false)

        verify { mockExoPlayer.repeatMode = Player.REPEAT_MODE_OFF }
    }

    // ============================================================
    // Time Properties Tests
    // ============================================================

    test("currentTime should return position in seconds") {
        provider.createPlayerView(mockContext)

        provider.currentTime shouldBe 5.0
    }

    test("duration should return duration in seconds") {
        provider.createPlayerView(mockContext)

        provider.duration shouldBe 60.0
    }

    // ============================================================
    // Unload Tests
    // ============================================================

    test("unload should stop progress updates") {
        provider.createPlayerView(mockContext)

        provider.unload()

        verify { mockProgressScheduler.cancel() }
    }

    test("unload should stop ExoPlayer") {
        provider.createPlayerView(mockContext)

        provider.unload()

        verify { mockExoPlayer.stop() }
    }

    test("unload should clear media items") {
        provider.createPlayerView(mockContext)

        provider.unload()

        verify { mockExoPlayer.clearMediaItems() }
    }

    // ============================================================
    // Release Tests
    // ============================================================

    test("release should stop progress updates") {
        provider.createPlayerView(mockContext)

        provider.release()

        verify { mockProgressScheduler.cancel() }
    }

    test("release should remove listener from ExoPlayer") {
        provider.createPlayerView(mockContext)

        provider.release()

        verify { mockExoPlayer.removeListener(any()) }
    }

    test("release should release ExoPlayer") {
        provider.createPlayerView(mockContext)

        provider.release()

        verify { mockExoPlayer.release() }
    }

    // ============================================================
    // Default Factory Tests
    // ============================================================

    // Note: This test is disabled because it requires a real Android environment.
    // The default constructor creates real Android objects (DefaultTrackSelectorFactory, etc.)
    // which cannot be instantiated in a unit test without Robolectric.
    // This is tested in integration tests instead.
    xtest("creating provider with no arguments should use default factories") {
        // This test verifies that the default constructor works
        // without throwing exceptions
        val defaultProvider = ExoPlayerProvider()

        defaultProvider shouldNotBe null
        defaultProvider.providerId shouldBe "media3"
    }
})
