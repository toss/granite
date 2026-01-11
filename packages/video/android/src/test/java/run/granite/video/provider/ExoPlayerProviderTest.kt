package run.granite.video.provider

import android.content.Context
import android.view.SurfaceView
import android.view.TextureView
import android.widget.FrameLayout
import androidx.media3.common.Player
import androidx.media3.datasource.DataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import io.kotest.core.spec.style.BehaviorSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.mockk.*
import run.granite.video.provider.factory.ExoPlayerFactory
import run.granite.video.provider.factory.MediaSourceFactory
import run.granite.video.provider.factory.VideoSurfaceFactory
import run.granite.video.provider.scheduler.ProgressScheduler

class ExoPlayerProviderTest : BehaviorSpec({

    lateinit var mockContext: Context
    lateinit var mockExoPlayer: ExoPlayer
    lateinit var mockExoPlayerFactory: ExoPlayerFactory
    lateinit var mockVideoSurfaceFactory: VideoSurfaceFactory
    lateinit var mockMediaSourceFactory: MediaSourceFactory
    lateinit var mockProgressScheduler: ProgressScheduler
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
        mockDelegate = mockk(relaxed = true)
        mockSurfaceView = mockk(relaxed = true)
        mockTextureView = mockk(relaxed = true)
        mockFrameLayout = mockk(relaxed = true)
        mockMediaSource = mockk(relaxed = true)

        every { mockExoPlayerFactory.create(any(), any()) } returns mockExoPlayer
        every { mockVideoSurfaceFactory.createSurfaceView(any()) } returns mockSurfaceView
        every { mockVideoSurfaceFactory.createTextureView(any()) } returns mockTextureView
        every { mockVideoSurfaceFactory.createContainer(any()) } returns mockFrameLayout
        every { mockMediaSourceFactory.create(any(), any()) } returns mockMediaSource
        every { mockExoPlayer.currentPosition } returns 5000L
        every { mockExoPlayer.duration } returns 60000L

        provider = ExoPlayerProvider(
            exoPlayerFactory = mockExoPlayerFactory,
            videoSurfaceFactory = mockVideoSurfaceFactory,
            mediaSourceFactory = mockMediaSourceFactory,
            progressScheduler = mockProgressScheduler
        )
        provider.delegate = mockDelegate
    }

    afterTest {
        clearAllMocks()
    }

    Given("provider identification") {
        Then("providerId should be media3") {
            provider.providerId shouldBe "media3"
        }

        Then("providerName should be Media3 ExoPlayer") {
            provider.providerName shouldBe "Media3 ExoPlayer"
        }
    }

    Given("createPlayerView is called") {
        When("using SurfaceView (default)") {
            val view = provider.createPlayerView(mockContext)

            Then("should create container via factory") {
                verify { mockVideoSurfaceFactory.createContainer(mockContext) }
            }

            Then("should create ExoPlayer via factory") {
                verify { mockExoPlayerFactory.create(eq(mockContext), any()) }
            }

            Then("should create SurfaceView via factory") {
                verify { mockVideoSurfaceFactory.createSurfaceView(mockContext) }
            }

            Then("should set video surface view on player") {
                verify { mockExoPlayer.setVideoSurfaceView(mockSurfaceView) }
            }

            Then("should return the container") {
                view shouldBe mockFrameLayout
            }
        }

        When("using TextureView") {
            provider.setUseTextureView(true)
            provider.createPlayerView(mockContext)

            Then("should create TextureView via factory") {
                verify { mockVideoSurfaceFactory.createTextureView(mockContext) }
            }

            Then("should set video texture view on player") {
                verify { mockExoPlayer.setVideoTextureView(mockTextureView) }
            }
        }
    }

    Given("loadSource is called") {
        beforeTest {
            provider.createPlayerView(mockContext)
        }

        When("loading a valid source") {
            val source = GraniteVideoSource(
                uri = "https://example.com/video.mp4",
                type = null,
                headers = mapOf("Authorization" to "Bearer token"),
                startPosition = 0.0
            )

            provider.loadSource(source)

            Then("should notify delegate of load start") {
                verify {
                    mockDelegate.onLoadStart(
                        isNetwork = true,
                        type = any(),
                        uri = "https://example.com/video.mp4"
                    )
                }
            }

            Then("should create media source via factory") {
                verify { mockMediaSourceFactory.create(source, any()) }
            }

            Then("should set media source on player") {
                verify { mockExoPlayer.setMediaSource(mockMediaSource) }
            }

            Then("should prepare player") {
                verify { mockExoPlayer.prepare() }
            }
        }

        When("loading source with start position") {
            val source = GraniteVideoSource(
                uri = "https://example.com/video.mp4",
                type = null,
                headers = null,
                startPosition = 10.0
            )

            provider.loadSource(source)

            Then("should seek to start position") {
                verify { mockExoPlayer.seekTo(10L) }
            }
        }

        When("loading source with null uri") {
            val source = GraniteVideoSource(
                uri = null,
                type = null,
                headers = null,
                startPosition = 0.0
            )

            provider.loadSource(source)

            Then("should not create media source") {
                verify(exactly = 0) { mockMediaSourceFactory.create(any(), any()) }
            }
        }
    }

    Given("playback control") {
        beforeTest {
            provider.createPlayerView(mockContext)
        }

        When("play is called") {
            provider.play()

            Then("should call play on ExoPlayer") {
                verify { mockExoPlayer.play() }
            }

            Then("should start progress updates") {
                verify { mockProgressScheduler.schedule(any(), any()) }
            }

            Then("should notify delegate of playback state change") {
                verify {
                    mockDelegate.onPlaybackStateChanged(
                        isPlaying = true,
                        isSeeking = false,
                        isLooping = any()
                    )
                }
            }

            Then("isPlaying should be true") {
                provider.isPlaying shouldBe true
            }
        }

        When("pause is called") {
            provider.play()
            clearMocks(mockDelegate, mockProgressScheduler, answers = false)

            provider.pause()

            Then("should call pause on ExoPlayer") {
                verify { mockExoPlayer.pause() }
            }

            Then("should stop progress updates") {
                verify { mockProgressScheduler.cancel() }
            }

            Then("should notify delegate of playback state change") {
                verify {
                    mockDelegate.onPlaybackStateChanged(
                        isPlaying = false,
                        isSeeking = false,
                        isLooping = any()
                    )
                }
            }

            Then("isPlaying should be false") {
                provider.isPlaying shouldBe false
            }
        }

        When("seek is called") {
            val seekTime = 30.0
            provider.seek(seekTime, 0.0)

            Then("should seek ExoPlayer to position in milliseconds") {
                verify { mockExoPlayer.seekTo(30000L) }
            }

            Then("should notify delegate of seek") {
                verify { mockDelegate.onSeek(any(), eq(seekTime)) }
            }

            Then("should notify delegate of seeking state") {
                verify {
                    mockDelegate.onPlaybackStateChanged(
                        isPlaying = any(),
                        isSeeking = true,
                        isLooping = any()
                    )
                }
            }
        }
    }

    Given("volume control") {
        beforeTest {
            provider.createPlayerView(mockContext)
        }

        When("setVolume is called") {
            provider.setVolume(0.5f)

            Then("should set volume on ExoPlayer") {
                verify { mockExoPlayer.volume = 0.5f }
            }

            Then("should notify delegate of volume change") {
                verify { mockDelegate.onVolumeChange(0.5f) }
            }
        }

        When("setMuted is called with true") {
            provider.setVolume(0.8f)
            provider.setMuted(true)

            Then("should set volume to 0 on ExoPlayer") {
                verify { mockExoPlayer.volume = 0f }
            }
        }

        When("setMuted is called with false") {
            provider.setVolume(0.8f)
            provider.setMuted(true)
            clearMocks(mockExoPlayer, answers = false)
            provider.setMuted(false)

            Then("should restore volume on ExoPlayer") {
                verify { mockExoPlayer.volume = 0.8f }
            }
        }
    }

    Given("rate control") {
        beforeTest {
            provider.createPlayerView(mockContext)
        }

        When("setRate is called") {
            provider.setRate(1.5f)

            Then("should set playback speed on ExoPlayer") {
                verify { mockExoPlayer.setPlaybackSpeed(1.5f) }
            }

            Then("should notify delegate of rate change") {
                verify { mockDelegate.onPlaybackRateChange(1.5f) }
            }
        }
    }

    Given("repeat control") {
        beforeTest {
            provider.createPlayerView(mockContext)
        }

        When("setRepeat is called with true") {
            provider.setRepeat(true)

            Then("should set repeat mode to ONE on ExoPlayer") {
                verify { mockExoPlayer.repeatMode = Player.REPEAT_MODE_ONE }
            }
        }

        When("setRepeat is called with false") {
            provider.setRepeat(false)

            Then("should set repeat mode to OFF on ExoPlayer") {
                verify { mockExoPlayer.repeatMode = Player.REPEAT_MODE_OFF }
            }
        }
    }

    Given("currentTime and duration") {
        beforeTest {
            provider.createPlayerView(mockContext)
        }

        Then("currentTime should return position in seconds") {
            provider.currentTime shouldBe 5.0
        }

        Then("duration should return duration in seconds") {
            provider.duration shouldBe 60.0
        }
    }

    Given("unload is called") {
        beforeTest {
            provider.createPlayerView(mockContext)
        }

        When("unloading") {
            provider.unload()

            Then("should stop progress updates") {
                verify { mockProgressScheduler.cancel() }
            }

            Then("should stop ExoPlayer") {
                verify { mockExoPlayer.stop() }
            }

            Then("should clear media items") {
                verify { mockExoPlayer.clearMediaItems() }
            }
        }
    }

    Given("release is called") {
        beforeTest {
            provider.createPlayerView(mockContext)
        }

        When("releasing") {
            provider.release()

            Then("should stop progress updates") {
                verify { mockProgressScheduler.cancel() }
            }

            Then("should remove listener from ExoPlayer") {
                verify { mockExoPlayer.removeListener(any()) }
            }

            Then("should release ExoPlayer") {
                verify { mockExoPlayer.release() }
            }
        }
    }

    Given("default factory injection") {
        When("creating provider with no arguments") {
            val defaultProvider = ExoPlayerProvider()

            Then("should use default factories") {
                defaultProvider shouldNotBe null
                defaultProvider.providerId shouldBe "media3"
            }
        }
    }
})
