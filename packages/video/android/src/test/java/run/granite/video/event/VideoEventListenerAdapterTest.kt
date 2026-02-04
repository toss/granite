package run.granite.video.event

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.mockk.*
import run.granite.video.provider.GraniteVideoErrorData
import run.granite.video.provider.GraniteVideoLoadData
import run.granite.video.provider.GraniteVideoProgressData

class VideoEventListenerAdapterTest : FunSpec({

    lateinit var mockDispatcher: VideoEventDispatcher
    lateinit var mockWritableMap: WritableMap
    lateinit var adapter: VideoEventListenerAdapter
    val viewId = 123
    val surfaceId = 1

    beforeTest {
        mockDispatcher = mockk(relaxed = true)
        mockWritableMap = mockk(relaxed = true)

        // Mock static Arguments.createMap() to return our mock
        mockkStatic(Arguments::class)
        every { Arguments.createMap() } returns mockWritableMap

        // Mock getSurfaceId() to return test surfaceId
        every { mockDispatcher.getSurfaceId() } returns surfaceId

        adapter = VideoEventListenerAdapter(
            dispatcher = mockDispatcher,
            viewIdProvider = { viewId }
        )
    }

    afterTest {
        clearAllMocks()
        unmockkStatic(Arguments::class)
    }

    // ============================================================
    // onLoadStart Tests
    // ============================================================

    test("onLoadStart should dispatch topVideoLoadStart event") {
        adapter.onLoadStart(true, "mp4", "https://example.com/video.mp4")

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoLoadStartEvent> {
                it.getEventName() == "topVideoLoadStart" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onLoad Tests
    // ============================================================

    test("onLoad should dispatch topVideoLoad event") {
        val data = GraniteVideoLoadData(
            currentTime = 0.0,
            duration = 60.0,
            naturalWidth = 1920.0,
            naturalHeight = 1080.0,
            orientation = "landscape"
        )

        adapter.onLoad(data)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoLoadEvent> {
                it.getEventName() == "topVideoLoad" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onError Tests
    // ============================================================

    test("onError should dispatch topVideoError event") {
        val error = GraniteVideoErrorData(
            code = 1001,
            domain = "ExoPlayer",
            localizedDescription = "Test error",
            errorString = "ERROR_TEST"
        )

        adapter.onError(error)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoErrorEvent> {
                it.getEventName() == "topVideoError" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onProgress Tests
    // ============================================================

    test("onProgress should dispatch topVideoProgress event") {
        val data = GraniteVideoProgressData(
            currentTime = 10.0,
            playableDuration = 20.0,
            seekableDuration = 60.0
        )

        adapter.onProgress(data)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoProgressEvent> {
                it.getEventName() == "topVideoProgress" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onSeek Tests
    // ============================================================

    test("onSeek should dispatch topVideoSeek event") {
        adapter.onSeek(5.0, 10.0)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoSeekEvent> {
                it.getEventName() == "topVideoSeek" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onEnd Tests
    // ============================================================

    test("onEnd should dispatch topVideoEnd event") {
        adapter.onEnd()

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoEndEvent> {
                it.getEventName() == "topVideoEnd" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onBuffer Tests
    // ============================================================

    test("onBuffer should dispatch topVideoBuffer event") {
        adapter.onBuffer(true)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoBufferEvent> {
                it.getEventName() == "topVideoBuffer" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onBandwidthUpdate Tests
    // ============================================================

    test("onBandwidthUpdate should dispatch topVideoBandwidthUpdate event") {
        adapter.onBandwidthUpdate(5000000.0, 1920, 1080)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoBandwidthUpdateEvent> {
                it.getEventName() == "topVideoBandwidthUpdate" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onPlaybackStateChanged Tests
    // ============================================================

    test("onPlaybackStateChanged should dispatch topVideoPlaybackStateChanged event") {
        adapter.onPlaybackStateChanged(true, false, false)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoPlaybackStateChangedEvent> {
                it.getEventName() == "topVideoPlaybackStateChanged" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onPlaybackRateChange Tests
    // ============================================================

    test("onPlaybackRateChange should dispatch topVideoPlaybackRateChange event") {
        adapter.onPlaybackRateChange(1.5f)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoPlaybackRateChangeEvent> {
                it.getEventName() == "topVideoPlaybackRateChange" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onVolumeChange Tests
    // ============================================================

    test("onVolumeChange should dispatch topVideoVolumeChange event") {
        adapter.onVolumeChange(0.5f)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoVolumeChangeEvent> {
                it.getEventName() == "topVideoVolumeChange" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onIdle Tests
    // ============================================================

    test("onIdle should dispatch topVideoIdle event") {
        adapter.onIdle()

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoIdleEvent> {
                it.getEventName() == "topVideoIdle" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // onReadyForDisplay Tests
    // ============================================================

    test("onReadyForDisplay should dispatch topVideoReadyForDisplay event") {
        adapter.onReadyForDisplay()

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoReadyForDisplayEvent> {
                it.getEventName() == "topVideoReadyForDisplay" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // Fullscreen Events Tests
    // ============================================================

    test("onFullscreenPlayerWillPresent should dispatch topVideoFullscreenPlayerWillPresent event") {
        adapter.onFullscreenPlayerWillPresent()

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoFullscreenPlayerWillPresentEvent> {
                it.getEventName() == "topVideoFullscreenPlayerWillPresent" && it.viewTag == viewId
            })
        }
    }

    test("onFullscreenPlayerDidPresent should dispatch topVideoFullscreenPlayerDidPresent event") {
        adapter.onFullscreenPlayerDidPresent()

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoFullscreenPlayerDidPresentEvent> {
                it.getEventName() == "topVideoFullscreenPlayerDidPresent" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // PiP Tests
    // ============================================================

    test("onPictureInPictureStatusChanged should dispatch topVideoPictureInPictureStatusChanged event") {
        adapter.onPictureInPictureStatusChanged(true)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoPictureInPictureStatusChangedEvent> {
                it.getEventName() == "topVideoPictureInPictureStatusChanged" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // Aspect Ratio Tests
    // ============================================================

    test("onAspectRatioChanged should dispatch topVideoAspectRatio event") {
        adapter.onAspectRatioChanged(16.0, 9.0)

        verify {
            mockDispatcher.dispatchEvent(match<GraniteVideoAspectRatioEvent> {
                it.getEventName() == "topVideoAspectRatio" && it.viewTag == viewId
            })
        }
    }

    // ============================================================
    // Dynamic viewId Tests
    // ============================================================

    test("viewId changes dynamically should use updated viewId for each dispatch") {
        var currentViewId = 100

        val dynamicAdapter = VideoEventListenerAdapter(
            dispatcher = mockDispatcher,
            viewIdProvider = { currentViewId }
        )

        dynamicAdapter.onEnd()
        currentViewId = 200
        dynamicAdapter.onEnd()

        verifyOrder {
            mockDispatcher.dispatchEvent(match<GraniteVideoEndEvent> { it.viewTag == 100 })
            mockDispatcher.dispatchEvent(match<GraniteVideoEndEvent> { it.viewTag == 200 })
        }
    }
})
