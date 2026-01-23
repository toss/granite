package run.granite.video.helpers

import run.granite.video.provider.GraniteVideoErrorData
import run.granite.video.provider.GraniteVideoLoadData
import run.granite.video.provider.GraniteVideoProgressData

data class DispatchedEvent(
    val name: String,
    val viewId: Int,
    val data: Map<String, Any?>
)

class TestVideoEventDispatcher {
    private val _events = mutableListOf<DispatchedEvent>()
    val events: List<DispatchedEvent> get() = _events.toList()

    fun dispatchLoadStart(viewId: Int, isNetwork: Boolean, type: String, uri: String) {
        _events.add(
            DispatchedEvent(
                name = "loadStart",
                viewId = viewId,
                data = mapOf("isNetwork" to isNetwork, "type" to type, "uri" to uri)
            )
        )
    }

    fun dispatchLoad(viewId: Int, data: GraniteVideoLoadData) {
        _events.add(
            DispatchedEvent(
                name = "load",
                viewId = viewId,
                data = mapOf(
                    "currentTime" to data.currentTime,
                    "duration" to data.duration,
                    "naturalWidth" to data.naturalWidth,
                    "naturalHeight" to data.naturalHeight,
                    "orientation" to data.orientation
                )
            )
        )
    }

    fun dispatchProgress(viewId: Int, data: GraniteVideoProgressData) {
        _events.add(
            DispatchedEvent(
                name = "progress",
                viewId = viewId,
                data = mapOf(
                    "currentTime" to data.currentTime,
                    "playableDuration" to data.playableDuration,
                    "seekableDuration" to data.seekableDuration
                )
            )
        )
    }

    fun dispatchError(viewId: Int, data: GraniteVideoErrorData) {
        _events.add(
            DispatchedEvent(
                name = "error",
                viewId = viewId,
                data = mapOf(
                    "code" to data.code,
                    "domain" to data.domain,
                    "localizedDescription" to data.localizedDescription,
                    "errorString" to data.errorString
                )
            )
        )
    }

    fun dispatchEnd(viewId: Int) {
        _events.add(DispatchedEvent(name = "end", viewId = viewId, data = emptyMap()))
    }

    fun dispatchBuffer(viewId: Int, isBuffering: Boolean) {
        _events.add(
            DispatchedEvent(
                name = "buffer",
                viewId = viewId,
                data = mapOf("isBuffering" to isBuffering)
            )
        )
    }

    fun dispatchSeek(viewId: Int, currentTime: Double, seekTime: Double) {
        _events.add(
            DispatchedEvent(
                name = "seek",
                viewId = viewId,
                data = mapOf("currentTime" to currentTime, "seekTime" to seekTime)
            )
        )
    }

    fun dispatchPlaybackStateChanged(viewId: Int, isPlaying: Boolean, isSeeking: Boolean, isLooping: Boolean) {
        _events.add(
            DispatchedEvent(
                name = "playbackStateChanged",
                viewId = viewId,
                data = mapOf("isPlaying" to isPlaying, "isSeeking" to isSeeking, "isLooping" to isLooping)
            )
        )
    }

    fun dispatchVolumeChange(viewId: Int, volume: Float) {
        _events.add(
            DispatchedEvent(
                name = "volumeChange",
                viewId = viewId,
                data = mapOf("volume" to volume)
            )
        )
    }

    fun dispatchRateChange(viewId: Int, rate: Float) {
        _events.add(
            DispatchedEvent(
                name = "rateChange",
                viewId = viewId,
                data = mapOf("rate" to rate)
            )
        )
    }

    fun getEventsOfType(name: String): List<DispatchedEvent> = _events.filter { it.name == name }

    fun hasEvent(name: String): Boolean = _events.any { it.name == name }

    fun clear() {
        _events.clear()
    }
}
