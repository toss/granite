package run.granite.video.provider.listener

import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.VideoSize
import io.kotest.core.spec.style.BehaviorSpec
import io.kotest.matchers.shouldBe
import io.mockk.*
import run.granite.video.provider.GraniteVideoDelegate
import run.granite.video.provider.GraniteVideoErrorData
import run.granite.video.provider.GraniteVideoLoadData

class ExoPlayerEventListenerTest : BehaviorSpec({

    lateinit var mockDelegate: GraniteVideoDelegate
    lateinit var mockStateProvider: PlaybackStateProvider
    lateinit var listener: ExoPlayerEventListener

    var capturedPlayingChanged: Boolean? = null
    var capturedVideoWidth: Int? = null
    var capturedVideoHeight: Int? = null

    beforeTest {
        mockDelegate = mockk(relaxed = true)
        mockStateProvider = mockk(relaxed = true)

        capturedPlayingChanged = null
        capturedVideoWidth = null
        capturedVideoHeight = null

        every { mockStateProvider.isPlaying } returns false
        every { mockStateProvider.isSeeking } returns false
        every { mockStateProvider.isLooping } returns false
        every { mockStateProvider.currentTime } returns 5.0
        every { mockStateProvider.duration } returns 60.0

        listener = ExoPlayerEventListener(
            delegateProvider = { mockDelegate },
            stateProvider = mockStateProvider,
            onPlayingChanged = { capturedPlayingChanged = it },
            onVideoSizeChanged = { w, h ->
                capturedVideoWidth = w
                capturedVideoHeight = h
            }
        )
    }

    afterTest {
        clearAllMocks()
    }

    Given("onPlaybackStateChanged") {
        When("state is IDLE") {
            listener.onPlaybackStateChanged(Player.STATE_IDLE)

            Then("should call delegate.onIdle()") {
                verify { mockDelegate.onIdle() }
            }
        }

        When("state is BUFFERING") {
            listener.onPlaybackStateChanged(Player.STATE_BUFFERING)

            Then("should call delegate.onBuffer(true)") {
                verify { mockDelegate.onBuffer(true) }
            }
        }

        When("state is READY") {
            listener.onPlaybackStateChanged(Player.STATE_READY)

            Then("should call delegate.onBuffer(false)") {
                verify { mockDelegate.onBuffer(false) }
            }

            Then("should call delegate.onReadyForDisplay()") {
                verify { mockDelegate.onReadyForDisplay() }
            }

            Then("should call delegate.onLoad with data from state provider") {
                verify {
                    mockDelegate.onLoad(match<GraniteVideoLoadData> {
                        it.currentTime == 5.0 && it.duration == 60.0
                    })
                }
            }
        }

        When("state is ENDED") {
            listener.onPlaybackStateChanged(Player.STATE_ENDED)

            Then("should call delegate.onEnd()") {
                verify { mockDelegate.onEnd() }
            }
        }
    }

    Given("onIsPlayingChanged") {
        When("playing starts") {
            listener.onIsPlayingChanged(true)

            Then("should invoke onPlayingChanged callback") {
                capturedPlayingChanged shouldBe true
            }

            Then("should call delegate.onPlaybackStateChanged") {
                verify {
                    mockDelegate.onPlaybackStateChanged(
                        isPlaying = true,
                        isSeeking = false,
                        isLooping = false
                    )
                }
            }
        }

        When("playing stops") {
            listener.onIsPlayingChanged(false)

            Then("should invoke onPlayingChanged callback with false") {
                capturedPlayingChanged shouldBe false
            }
        }

        When("state provider reports seeking") {
            every { mockStateProvider.isSeeking } returns true
            every { mockStateProvider.isLooping } returns true

            listener.onIsPlayingChanged(true)

            Then("should include seeking and looping state from provider") {
                verify {
                    mockDelegate.onPlaybackStateChanged(
                        isPlaying = true,
                        isSeeking = true,
                        isLooping = true
                    )
                }
            }
        }
    }

    Given("onPlayerError") {
        When("error occurs") {
            val mockError = mockk<PlaybackException>()
            every { mockError.errorCode } returns 1001
            every { mockError.message } returns "Test error message"
            every { mockError.errorCodeName } returns "ERROR_CODE_TEST"

            listener.onPlayerError(mockError)

            Then("should call delegate.onError with error data") {
                verify {
                    mockDelegate.onError(match<GraniteVideoErrorData> {
                        it.code == 1001 &&
                        it.domain == "ExoPlayer" &&
                        it.localizedDescription == "Test error message" &&
                        it.errorString == "ERROR_CODE_TEST"
                    })
                }
            }
        }

        When("error has null message") {
            val mockError = mockk<PlaybackException>()
            every { mockError.errorCode } returns 1002
            every { mockError.message } returns null
            every { mockError.errorCodeName } returns "ERROR_CODE_UNKNOWN"

            listener.onPlayerError(mockError)

            Then("should use 'Unknown error' as default message") {
                verify {
                    mockDelegate.onError(match<GraniteVideoErrorData> {
                        it.localizedDescription == "Unknown error"
                    })
                }
            }
        }
    }

    Given("onVideoSizeChanged") {
        When("valid video size is reported") {
            val videoSize = VideoSize(1920, 1080)

            listener.onVideoSizeChanged(videoSize)

            Then("should invoke onVideoSizeChanged callback") {
                capturedVideoWidth shouldBe 1920
                capturedVideoHeight shouldBe 1080
            }

            Then("should call delegate.onAspectRatioChanged") {
                verify {
                    mockDelegate.onAspectRatioChanged(1920.0, 1080.0)
                }
            }

            Then("should call delegate.onLoad with updated dimensions") {
                verify {
                    mockDelegate.onLoad(match<GraniteVideoLoadData> {
                        it.naturalWidth == 1920.0 &&
                        it.naturalHeight == 1080.0 &&
                        it.orientation == "landscape"
                    })
                }
            }
        }

        When("portrait video size is reported") {
            val videoSize = VideoSize(1080, 1920)

            listener.onVideoSizeChanged(videoSize)

            Then("should report portrait orientation") {
                verify {
                    mockDelegate.onLoad(match<GraniteVideoLoadData> {
                        it.orientation == "portrait"
                    })
                }
            }
        }

        When("zero width is reported") {
            val videoSize = VideoSize(0, 1080)

            listener.onVideoSizeChanged(videoSize)

            Then("should not call delegate methods") {
                verify(exactly = 0) { mockDelegate.onAspectRatioChanged(any(), any()) }
                verify(exactly = 0) { mockDelegate.onLoad(any()) }
            }
        }

        When("zero height is reported") {
            val videoSize = VideoSize(1920, 0)

            listener.onVideoSizeChanged(videoSize)

            Then("should not call delegate methods") {
                verify(exactly = 0) { mockDelegate.onAspectRatioChanged(any(), any()) }
            }
        }
    }

    Given("delegate is null") {
        beforeTest {
            listener = ExoPlayerEventListener(
                delegateProvider = { null },
                stateProvider = mockStateProvider,
                onPlayingChanged = {},
                onVideoSizeChanged = { _, _ -> }
            )
        }

        When("events are triggered") {
            Then("should not throw exceptions") {
                listener.onPlaybackStateChanged(Player.STATE_READY)
                listener.onIsPlayingChanged(true)
                listener.onVideoSizeChanged(VideoSize(1920, 1080))
                // No assertions needed - test passes if no exception
            }
        }
    }
})
