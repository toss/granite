package run.granite.video

import android.content.Context
import android.view.View
import io.kotest.core.spec.style.BehaviorSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.mockk.*
import run.granite.video.provider.*

class GraniteVideoViewTest : BehaviorSpec({

    lateinit var mockContext: Context
    lateinit var mockProvider: GraniteVideoProvider
    lateinit var mockPlayerView: View
    lateinit var mockEventListener: GraniteVideoEventListener

    beforeTest {
        mockContext = mockk(relaxed = true)
        mockProvider = mockk(relaxed = true)
        mockPlayerView = mockk(relaxed = true)
        mockEventListener = mockk(relaxed = true)

        every { mockProvider.createPlayerView(any()) } returns mockPlayerView
        every { mockProvider.providerId } returns "test-provider"
        every { mockProvider.providerName } returns "Test Provider"

        // Clear registry before each test
        GraniteVideoRegistry.clear()
    }

    afterTest {
        clearAllMocks()
        GraniteVideoRegistry.clear()
    }

    Given("GraniteVideoView initialization") {
        When("created with provider factory") {
            val view = GraniteVideoView(
                context = mockContext,
                providerFactory = { mockProvider }
            )

            Then("should use the provided factory") {
                view.currentProvider shouldBe mockProvider
            }

            Then("should set delegate on provider") {
                verify { mockProvider.delegate = view }
            }

            Then("should create player view") {
                verify { mockProvider.createPlayerView(mockContext) }
            }
        }

        When("created with provider ID") {
            GraniteVideoRegistry.registerFactory("custom") { mockProvider }

            val view = GraniteVideoView(
                context = mockContext,
                providerId = "custom"
            )

            Then("should use provider from registry") {
                view.currentProvider shouldBe mockProvider
            }
        }

        When("created with no arguments and registry has provider") {
            GraniteVideoRegistry.registerFactory("default") { mockProvider }
            GraniteVideoRegistry.setDefaultProvider("default")

            val view = GraniteVideoView(context = mockContext)

            Then("should use default provider from registry") {
                view.currentProvider shouldBe mockProvider
            }
        }
    }

    Given("setSource") {
        val view = GraniteVideoView(
            context = mockContext,
            providerFactory = { mockProvider }
        )

        When("called with valid source") {
            val source = mapOf(
                "uri" to "https://example.com/video.mp4",
                "type" to "mp4",
                "startPosition" to 10.0,
                "headers" to mapOf("Authorization" to "Bearer token")
            )

            view.setSource(source)

            Then("should call loadSource on provider") {
                verify {
                    mockProvider.loadSource(match<GraniteVideoSource> {
                        it.uri == "https://example.com/video.mp4" &&
                        it.type == "mp4" &&
                        it.startPosition == 10.0 &&
                        it.headers?.get("Authorization") == "Bearer token"
                    })
                }
            }
        }

        When("called with null source") {
            view.setSource(null)

            Then("should not call loadSource") {
                verify(exactly = 0) { mockProvider.loadSource(any()) }
            }
        }

        When("source is set and view is not paused") {
            view.setPaused(false)
            clearMocks(mockProvider, answers = false)

            view.setSource(mapOf("uri" to "https://example.com/video.mp4"))

            Then("should call play after loading") {
                verifyOrder {
                    mockProvider.loadSource(any())
                    mockProvider.play()
                }
            }
        }
    }

    Given("playback control") {
        val view = GraniteVideoView(
            context = mockContext,
            providerFactory = { mockProvider }
        )

        When("setPaused(true)") {
            view.setPaused(true)

            Then("should call pause on provider") {
                verify { mockProvider.pause() }
            }
        }

        When("setPaused(false)") {
            view.setPaused(false)

            Then("should call play on provider") {
                verify { mockProvider.play() }
            }
        }

        When("setMuted") {
            view.setMuted(true)

            Then("should call setMuted on provider") {
                verify { mockProvider.setMuted(true) }
            }
        }

        When("setVolume") {
            view.setVolume(0.5f)

            Then("should call setVolume on provider") {
                verify { mockProvider.setVolume(0.5f) }
            }
        }

        When("setRate") {
            view.setRate(1.5f)

            Then("should call setRate on provider") {
                verify { mockProvider.setRate(1.5f) }
            }
        }

        When("setRepeat") {
            view.setRepeat(true)

            Then("should call setRepeat on provider") {
                verify { mockProvider.setRepeat(true) }
            }
        }

        When("seek") {
            view.seek(30.0, 0.5)

            Then("should call seek on provider") {
                verify { mockProvider.seek(30.0, 0.5) }
            }
        }
    }

    Given("resize mode") {
        val view = GraniteVideoView(
            context = mockContext,
            providerFactory = { mockProvider }
        )

        When("setResizeMode cover") {
            view.setResizeMode("cover")

            Then("should call setResizeMode with COVER") {
                verify { mockProvider.setResizeMode(GraniteVideoResizeMode.COVER) }
            }
        }

        When("setResizeMode stretch") {
            view.setResizeMode("stretch")

            Then("should call setResizeMode with STRETCH") {
                verify { mockProvider.setResizeMode(GraniteVideoResizeMode.STRETCH) }
            }
        }

        When("setResizeMode none") {
            view.setResizeMode("none")

            Then("should call setResizeMode with NONE") {
                verify { mockProvider.setResizeMode(GraniteVideoResizeMode.NONE) }
            }
        }

        When("setResizeMode contain or unknown") {
            view.setResizeMode("contain")

            Then("should call setResizeMode with CONTAIN") {
                verify { mockProvider.setResizeMode(GraniteVideoResizeMode.CONTAIN) }
            }
        }
    }

    Given("controls") {
        val view = GraniteVideoView(
            context = mockContext,
            providerFactory = { mockProvider }
        )

        When("setControls") {
            view.setControls(true)

            Then("should call setControlsEnabled on provider") {
                verify { mockProvider.setControlsEnabled(true) }
            }
        }

        When("setFullscreen") {
            view.setFullscreen(true)

            Then("should call setFullscreen on provider") {
                verify { mockProvider.setFullscreen(true, true) }
            }
        }

        When("setPictureInPicture") {
            view.setPictureInPicture(true)

            Then("should call setPictureInPictureEnabled on provider") {
                verify { mockProvider.setPictureInPictureEnabled(true) }
            }
        }
    }

    Given("buffer config") {
        val view = GraniteVideoView(
            context = mockContext,
            providerFactory = { mockProvider }
        )

        When("setBufferConfig with valid config") {
            val config = mapOf(
                "minBufferMs" to 10000,
                "maxBufferMs" to 30000,
                "bufferForPlaybackMs" to 2000
            )

            view.setBufferConfig(config)

            Then("should call setBufferConfig on provider") {
                verify {
                    mockProvider.setBufferConfig(match<GraniteVideoBufferConfig> {
                        it.minBufferMs == 10000 &&
                        it.maxBufferMs == 30000 &&
                        it.bufferForPlaybackMs == 2000
                    })
                }
            }
        }

        When("setBufferConfig with null") {
            view.setBufferConfig(null)

            Then("should not call setBufferConfig") {
                verify(exactly = 0) { mockProvider.setBufferConfig(any()) }
            }
        }
    }

    Given("delegate events") {
        val view = GraniteVideoView(
            context = mockContext,
            providerFactory = { mockProvider }
        )
        view.eventListener = mockEventListener

        When("onLoadStart is called") {
            view.onLoadStart(true, "mp4", "https://example.com/video.mp4")

            Then("should forward to eventListener") {
                verify { mockEventListener.onLoadStart(true, "mp4", "https://example.com/video.mp4") }
            }
        }

        When("onLoad is called") {
            val data = GraniteVideoLoadData(
                currentTime = 0.0,
                duration = 60.0,
                naturalWidth = 1920.0,
                naturalHeight = 1080.0,
                orientation = "landscape"
            )

            view.onLoad(data)

            Then("should forward to eventListener") {
                verify { mockEventListener.onLoad(data) }
            }
        }

        When("onError is called") {
            val error = GraniteVideoErrorData(
                code = 1001,
                domain = "ExoPlayer",
                localizedDescription = "Test error",
                errorString = "ERROR_TEST"
            )

            view.onError(error)

            Then("should forward to eventListener") {
                verify { mockEventListener.onError(error) }
            }
        }

        When("onProgress is called") {
            val data = GraniteVideoProgressData(
                currentTime = 10.0,
                playableDuration = 20.0,
                seekableDuration = 60.0
            )

            view.onProgress(data)

            Then("should forward to eventListener") {
                verify { mockEventListener.onProgress(data) }
            }
        }

        When("onEnd is called") {
            view.onEnd()

            Then("should forward to eventListener") {
                verify { mockEventListener.onEnd() }
            }
        }

        When("onBuffer is called") {
            view.onBuffer(true)

            Then("should forward to eventListener") {
                verify { mockEventListener.onBuffer(true) }
            }
        }

        When("onPlaybackStateChanged is called") {
            view.onPlaybackStateChanged(true, false, true)

            Then("should forward to eventListener") {
                verify { mockEventListener.onPlaybackStateChanged(true, false, true) }
            }
        }
    }

    Given("setProviderId at runtime") {
        val mockProvider2 = mockk<GraniteVideoProvider>(relaxed = true)
        val mockPlayerView2 = mockk<View>(relaxed = true)
        every { mockProvider2.createPlayerView(any()) } returns mockPlayerView2
        every { mockProvider2.providerId } returns "provider2"

        GraniteVideoRegistry.registerFactory("provider1") { mockProvider }
        GraniteVideoRegistry.registerFactory("provider2") { mockProvider2 }

        val view = GraniteVideoView(
            context = mockContext,
            providerId = "provider1"
        )

        When("changing provider at runtime") {
            view.setProviderId("provider2")

            Then("should switch to new provider") {
                view.currentProvider shouldBe mockProvider2
            }

            Then("should set delegate on new provider") {
                verify { mockProvider2.delegate = view }
            }

            Then("should create new player view") {
                verify { mockProvider2.createPlayerView(mockContext) }
            }
        }
    }

    Given("commands") {
        val view = GraniteVideoView(
            context = mockContext,
            providerFactory = { mockProvider }
        )

        When("pauseCommand") {
            view.pauseCommand()

            Then("should call pause on provider") {
                verify { mockProvider.pause() }
            }
        }

        When("resumeCommand") {
            view.resumeCommand()

            Then("should call play on provider") {
                verify { mockProvider.play() }
            }
        }

        When("seekCommand") {
            view.seekCommand(30.0, 0.1)

            Then("should call seek on provider") {
                verify { mockProvider.seek(30.0, 0.1) }
            }
        }

        When("setVolumeCommand") {
            view.setVolumeCommand(0.7f)

            Then("should call setVolume on provider") {
                verify { mockProvider.setVolume(0.7f) }
            }
        }

        When("setSourceCommand") {
            view.setSourceCommand("https://example.com/video.mp4")

            Then("should call loadSource with uri") {
                verify {
                    mockProvider.loadSource(match<GraniteVideoSource> {
                        it.uri == "https://example.com/video.mp4"
                    })
                }
            }
        }
    }
})
