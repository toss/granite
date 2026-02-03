package run.granite.video

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import run.granite.video.provider.GraniteVideoLoadData
import run.granite.video.provider.GraniteVideoProgressData
import run.granite.video.provider.GraniteVideoErrorData

object GraniteVideoEvents {

    fun createEmptyEvent(viewId: Int): WritableMap {
        return Arguments.createMap()
    }

    fun createLoadStartEvent(viewId: Int, isNetwork: Boolean, type: String, uri: String): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("isNetwork", isNetwork)
            putString("type", type)
            putString("uri", uri)
        }
    }

    fun createLoadEvent(viewId: Int, data: GraniteVideoLoadData): WritableMap {
        return Arguments.createMap().apply {
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

    fun createErrorEvent(viewId: Int, error: GraniteVideoErrorData): WritableMap {
        return Arguments.createMap().apply {
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

    fun createProgressEvent(viewId: Int, data: GraniteVideoProgressData): WritableMap {
        return Arguments.createMap().apply {
            putDouble("currentTime", data.currentTime)
            putDouble("playableDuration", data.playableDuration)
            putDouble("seekableDuration", data.seekableDuration)
        }
    }

    fun createSeekEvent(viewId: Int, currentTime: Double, seekTime: Double): WritableMap {
        return Arguments.createMap().apply {
            putDouble("currentTime", currentTime)
            putDouble("seekTime", seekTime)
        }
    }

    fun createBufferEvent(viewId: Int, isBuffering: Boolean): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("isBuffering", isBuffering)
        }
    }

    fun createBandwidthEvent(viewId: Int, bitrate: Double, width: Int, height: Int): WritableMap {
        return Arguments.createMap().apply {
            putDouble("bitrate", bitrate)
            putInt("width", width)
            putInt("height", height)
        }
    }

    fun createPlaybackStateEvent(viewId: Int, isPlaying: Boolean, isSeeking: Boolean, isLooping: Boolean): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("isPlaying", isPlaying)
            putBoolean("isSeeking", isSeeking)
            putBoolean("isLooping", isLooping)
        }
    }

    fun createPlaybackRateEvent(viewId: Int, rate: Float): WritableMap {
        return Arguments.createMap().apply {
            putDouble("playbackRate", rate.toDouble())
        }
    }

    fun createVolumeEvent(viewId: Int, volume: Float): WritableMap {
        return Arguments.createMap().apply {
            putDouble("volume", volume.toDouble())
        }
    }

    fun createAudioFocusEvent(viewId: Int, hasAudioFocus: Boolean): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("hasAudioFocus", hasAudioFocus)
        }
    }

    fun createPipStatusEvent(viewId: Int, isActive: Boolean): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("isActive", isActive)
        }
    }

    fun createControlsVisibilityEvent(viewId: Int, isVisible: Boolean): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("isVisible", isVisible)
        }
    }

    fun createExternalPlaybackEvent(viewId: Int, isActive: Boolean): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("isExternalPlaybackActive", isActive)
        }
    }

    fun createAspectRatioEvent(viewId: Int, width: Double, height: Double): WritableMap {
        return Arguments.createMap().apply {
            putDouble("width", width)
            putDouble("height", height)
        }
    }

    fun createTransferEndEvent(viewId: Int, uri: String, bytesTransferred: Long): WritableMap {
        return Arguments.createMap().apply {
            putString("uri", uri)
            putDouble("bytesTransferred", bytesTransferred.toDouble())
        }
    }
}
