package run.granite.video.event

import com.facebook.react.bridge.WritableMap
import io.kotest.core.spec.style.BehaviorSpec
import io.kotest.matchers.shouldBe
import io.mockk.*
import run.granite.video.provider.GraniteVideoErrorData
import run.granite.video.provider.GraniteVideoLoadData
import run.granite.video.provider.GraniteVideoProgressData

class VideoEventListenerAdapterTest : BehaviorSpec({

    lateinit var mockDispatcher: VideoEventDispatcher
    lateinit var adapter: VideoEventListenerAdapter
    val viewId = 123

    beforeTest {
        mockDispatcher = mockk(relaxed = true)
        adapter = VideoEventListenerAdapter(
            dispatcher = mockDispatcher,
            viewIdProvider = { viewId }
        )
    }

    afterTest {
        clearAllMocks()
    }

    Given("VideoEventListenerAdapter") {
        When("onLoadStart is called") {
            adapter.onLoadStart(true, "mp4", "https://example.com/video.mp4")

            Then("should dispatch topVideoLoadStart event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoLoadStart",
                        any()
                    )
                }
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

            adapter.onLoad(data)

            Then("should dispatch topVideoLoad event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoLoad",
                        any()
                    )
                }
            }
        }

        When("onError is called") {
            val error = GraniteVideoErrorData(
                code = 1001,
                domain = "ExoPlayer",
                localizedDescription = "Test error",
                errorString = "ERROR_TEST"
            )

            adapter.onError(error)

            Then("should dispatch topVideoError event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoError",
                        any()
                    )
                }
            }
        }

        When("onProgress is called") {
            val data = GraniteVideoProgressData(
                currentTime = 10.0,
                playableDuration = 20.0,
                seekableDuration = 60.0
            )

            adapter.onProgress(data)

            Then("should dispatch topVideoProgress event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoProgress",
                        any()
                    )
                }
            }
        }

        When("onSeek is called") {
            adapter.onSeek(5.0, 10.0)

            Then("should dispatch topVideoSeek event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoSeek",
                        any()
                    )
                }
            }
        }

        When("onEnd is called") {
            adapter.onEnd()

            Then("should dispatch topVideoEnd event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoEnd",
                        any()
                    )
                }
            }
        }

        When("onBuffer is called") {
            adapter.onBuffer(true)

            Then("should dispatch topVideoBuffer event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoBuffer",
                        any()
                    )
                }
            }
        }

        When("onBandwidthUpdate is called") {
            adapter.onBandwidthUpdate(5000000.0, 1920, 1080)

            Then("should dispatch topVideoBandwidthUpdate event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoBandwidthUpdate",
                        any()
                    )
                }
            }
        }

        When("onPlaybackStateChanged is called") {
            adapter.onPlaybackStateChanged(true, false, false)

            Then("should dispatch topVideoPlaybackStateChanged event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoPlaybackStateChanged",
                        any()
                    )
                }
            }
        }

        When("onPlaybackRateChange is called") {
            adapter.onPlaybackRateChange(1.5f)

            Then("should dispatch topVideoPlaybackRateChange event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoPlaybackRateChange",
                        any()
                    )
                }
            }
        }

        When("onVolumeChange is called") {
            adapter.onVolumeChange(0.5f)

            Then("should dispatch topVideoVolumeChange event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoVolumeChange",
                        any()
                    )
                }
            }
        }

        When("onIdle is called") {
            adapter.onIdle()

            Then("should dispatch topVideoIdle event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoIdle",
                        any()
                    )
                }
            }
        }

        When("onReadyForDisplay is called") {
            adapter.onReadyForDisplay()

            Then("should dispatch topVideoReadyForDisplay event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoReadyForDisplay",
                        any()
                    )
                }
            }
        }

        When("onFullscreenPlayerWillPresent is called") {
            adapter.onFullscreenPlayerWillPresent()

            Then("should dispatch topVideoFullscreenPlayerWillPresent event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoFullscreenPlayerWillPresent",
                        any()
                    )
                }
            }
        }

        When("onFullscreenPlayerDidPresent is called") {
            adapter.onFullscreenPlayerDidPresent()

            Then("should dispatch topVideoFullscreenPlayerDidPresent event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoFullscreenPlayerDidPresent",
                        any()
                    )
                }
            }
        }

        When("onPictureInPictureStatusChanged is called") {
            adapter.onPictureInPictureStatusChanged(true)

            Then("should dispatch topVideoPictureInPictureStatusChanged event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoPictureInPictureStatusChanged",
                        any()
                    )
                }
            }
        }

        When("onAspectRatioChanged is called") {
            adapter.onAspectRatioChanged(16.0, 9.0)

            Then("should dispatch topVideoAspectRatio event") {
                verify {
                    mockDispatcher.dispatchEvent(
                        viewId,
                        "topVideoAspectRatio",
                        any()
                    )
                }
            }
        }
    }

    Given("viewId changes dynamically") {
        var currentViewId = 100

        val dynamicAdapter = VideoEventListenerAdapter(
            dispatcher = mockDispatcher,
            viewIdProvider = { currentViewId }
        )

        When("viewId changes between events") {
            dynamicAdapter.onEnd()
            currentViewId = 200
            dynamicAdapter.onEnd()

            Then("should use updated viewId for each dispatch") {
                verifyOrder {
                    mockDispatcher.dispatchEvent(100, "topVideoEnd", any())
                    mockDispatcher.dispatchEvent(200, "topVideoEnd", any())
                }
            }
        }
    }
})
