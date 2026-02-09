package run.granite.navermap

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class GraniteNaverMapInitializedEvent(
    surfaceId: Int,
    viewId: Int
) : Event<GraniteNaverMapInitializedEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "onInitialized"
    override fun getEventData(): WritableMap = Arguments.createMap()
}

class GraniteNaverMapCameraChangeEvent(
    surfaceId: Int,
    viewId: Int,
    private val latitude: Double,
    private val longitude: Double,
    private val zoom: Double,
    private val contentRegion: List<GraniteNaverMapCoordinate>,
    private val coveringRegion: List<GraniteNaverMapCoordinate>
) : Event<GraniteNaverMapCameraChangeEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "onCameraChange"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putDouble("latitude", latitude)
        putDouble("longitude", longitude)
        putDouble("zoom", zoom)

        val contentArray = Arguments.createArray().apply {
            contentRegion.forEach { coord ->
                pushMap(Arguments.createMap().apply {
                    putDouble("latitude", coord.latitude)
                    putDouble("longitude", coord.longitude)
                })
            }
        }
        putArray("contentRegion", contentArray)

        val coveringArray = Arguments.createArray().apply {
            coveringRegion.forEach { coord ->
                pushMap(Arguments.createMap().apply {
                    putDouble("latitude", coord.latitude)
                    putDouble("longitude", coord.longitude)
                })
            }
        }
        putArray("coveringRegion", coveringArray)
    }
}

class GraniteNaverMapTouchEvent(
    surfaceId: Int,
    viewId: Int,
    private val reason: Int,
    private val animated: Boolean
) : Event<GraniteNaverMapTouchEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "onTouch"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putInt("reason", reason)
        putBoolean("animated", animated)
    }
}

class GraniteNaverMapClickEvent(
    surfaceId: Int,
    viewId: Int,
    private val x: Double,
    private val y: Double,
    private val latitude: Double,
    private val longitude: Double
) : Event<GraniteNaverMapClickEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "onMapClick"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putDouble("x", x)
        putDouble("y", y)
        putDouble("latitude", latitude)
        putDouble("longitude", longitude)
    }
}

class GraniteNaverMapMarkerClickEvent(
    surfaceId: Int,
    viewId: Int,
    private val markerId: String
) : Event<GraniteNaverMapMarkerClickEvent>(surfaceId, viewId) {
    override fun getEventName(): String = "onMarkerClick"
    override fun getEventData(): WritableMap = Arguments.createMap().apply {
        putString("id", markerId)
    }
}
