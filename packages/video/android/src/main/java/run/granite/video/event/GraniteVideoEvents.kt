package run.granite.video.event

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import run.granite.video.provider.GraniteVideoLoadData
import run.granite.video.provider.GraniteVideoErrorData
import run.granite.video.provider.GraniteVideoProgressData

class GraniteVideoLoadStartEvent(
    surfaceId: Int,
    viewId: Int,
    private val isNetwork: Boolean,
    private val type: String,
    private val uri: String
) : Event<GraniteVideoLoadStartEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoLoadStart"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putBoolean("isNetwork", isNetwork)
        putString("type", type)
        putString("uri", uri)
    }
}

class GraniteVideoLoadEvent(
    surfaceId: Int,
    viewId: Int,
    private val data: GraniteVideoLoadData
) : Event<GraniteVideoLoadEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoLoad"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putDouble("currentTime", data.currentTime)
        putDouble("duration", data.duration)

        val naturalSize = Arguments.createMap().apply {
            putDouble("width", data.naturalWidth)
            putDouble("height", data.naturalHeight)
            putString("orientation", data.orientation)
        }
        putMap("naturalSize", naturalSize)
    }
}

class GraniteVideoErrorEvent(
    surfaceId: Int,
    viewId: Int,
    private val error: GraniteVideoErrorData
) : Event<GraniteVideoErrorEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoError"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        val errorMap = Arguments.createMap().apply {
            putInt("code", error.code)
            putString("domain", error.domain)
            putString("localizedDescription", error.localizedDescription)
            putString("localizedFailureReason", "")
            putString("localizedRecoverySuggestion", "")
            putString("errorString", error.errorString)
        }
        putMap("error", errorMap)
    }
}

class GraniteVideoProgressEvent(
    surfaceId: Int,
    viewId: Int,
    private val data: GraniteVideoProgressData
) : Event<GraniteVideoProgressEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoProgress"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putDouble("currentTime", data.currentTime)
        putDouble("playableDuration", data.playableDuration)
        putDouble("seekableDuration", data.seekableDuration)
    }
}

class GraniteVideoSeekEvent(
    surfaceId: Int,
    viewId: Int,
    private val currentTime: Double,
    private val seekTime: Double
) : Event<GraniteVideoSeekEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoSeek"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putDouble("currentTime", currentTime)
        putDouble("seekTime", seekTime)
    }
}

class GraniteVideoEndEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteVideoEndEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoEnd"
    override fun getEventData(): WritableMap = Arguments.createMap()
}

class GraniteVideoBufferEvent(
    surfaceId: Int,
    viewId: Int,
    private val isBuffering: Boolean
) : Event<GraniteVideoBufferEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoBuffer"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putBoolean("isBuffering", isBuffering)
    }
}

class GraniteVideoBandwidthUpdateEvent(
    surfaceId: Int,
    viewId: Int,
    private val bitrate: Double,
    private val width: Int,
    private val height: Int
) : Event<GraniteVideoBandwidthUpdateEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoBandwidthUpdate"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putDouble("bitrate", bitrate)
        putInt("width", width)
        putInt("height", height)
    }
}

class GraniteVideoPlaybackStateChangedEvent(
    surfaceId: Int,
    viewId: Int,
    private val isPlaying: Boolean,
    private val isSeeking: Boolean,
    private val isLooping: Boolean
) : Event<GraniteVideoPlaybackStateChangedEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoPlaybackStateChanged"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putBoolean("isPlaying", isPlaying)
        putBoolean("isSeeking", isSeeking)
        putBoolean("isLooping", isLooping)
    }
}

class GraniteVideoPlaybackRateChangeEvent(
    surfaceId: Int,
    viewId: Int,
    private val rate: Float
) : Event<GraniteVideoPlaybackRateChangeEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoPlaybackRateChange"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putDouble("playbackRate", rate.toDouble())
    }
}

class GraniteVideoVolumeChangeEvent(
    surfaceId: Int,
    viewId: Int,
    private val volume: Float
) : Event<GraniteVideoVolumeChangeEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoVolumeChange"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putDouble("volume", volume.toDouble())
    }
}

class GraniteVideoIdleEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteVideoIdleEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoIdle"
    override fun getEventData(): WritableMap = Arguments.createMap()
}

class GraniteVideoReadyForDisplayEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteVideoReadyForDisplayEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoReadyForDisplay"
    override fun getEventData(): WritableMap = Arguments.createMap()
}

class GraniteVideoAudioFocusChangedEvent(
    surfaceId: Int,
    viewId: Int,
    private val hasAudioFocus: Boolean
) : Event<GraniteVideoAudioFocusChangedEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoAudioFocusChanged"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putBoolean("hasAudioFocus", hasAudioFocus)
    }
}

class GraniteVideoAudioBecomingNoisyEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteVideoAudioBecomingNoisyEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoAudioBecomingNoisy"
    override fun getEventData(): WritableMap = Arguments.createMap()
}

class GraniteVideoFullscreenPlayerWillPresentEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteVideoFullscreenPlayerWillPresentEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoFullscreenPlayerWillPresent"
    override fun getEventData(): WritableMap = Arguments.createMap()
}

class GraniteVideoFullscreenPlayerDidPresentEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteVideoFullscreenPlayerDidPresentEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoFullscreenPlayerDidPresent"
    override fun getEventData(): WritableMap = Arguments.createMap()
}

class GraniteVideoFullscreenPlayerWillDismissEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteVideoFullscreenPlayerWillDismissEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoFullscreenPlayerWillDismiss"
    override fun getEventData(): WritableMap = Arguments.createMap()
}

class GraniteVideoFullscreenPlayerDidDismissEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteVideoFullscreenPlayerDidDismissEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoFullscreenPlayerDidDismiss"
    override fun getEventData(): WritableMap = Arguments.createMap()
}

class GraniteVideoPictureInPictureStatusChangedEvent(
    surfaceId: Int,
    viewId: Int,
    private val isActive: Boolean
) : Event<GraniteVideoPictureInPictureStatusChangedEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoPictureInPictureStatusChanged"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putBoolean("isActive", isActive)
    }
}

class GraniteVideoControlsVisibilityChangeEvent(
    surfaceId: Int,
    viewId: Int,
    private val isVisible: Boolean
) : Event<GraniteVideoControlsVisibilityChangeEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoControlsVisibilityChange"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putBoolean("isVisible", isVisible)
    }
}

class GraniteVideoAspectRatioEvent(
    surfaceId: Int,
    viewId: Int,
    private val width: Double,
    private val height: Double
) : Event<GraniteVideoAspectRatioEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topVideoAspectRatio"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putDouble("width", width)
        putDouble("height", height)
    }
}

class GraniteVideoOnTransferEndEvent(
    surfaceId: Int,
    viewId: Int,
    private val uri: String, 
    private val bytesTransferred: Long
) : Event<GraniteVideoOnTransferEndEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "topTransferEnd"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putString("uri", uri)
        putLong("bytesTransferred", bytesTransferred)
    }
}
