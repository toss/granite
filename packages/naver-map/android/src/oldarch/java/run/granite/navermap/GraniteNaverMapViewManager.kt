package run.granite.navermap

import android.graphics.Color
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.naver.maps.geometry.LatLng
import com.naver.maps.geometry.LatLngBounds
import com.naver.maps.map.CameraAnimation
import com.naver.maps.map.CameraPosition
import com.naver.maps.map.CameraUpdate
import com.naver.maps.map.NaverMap

class GraniteNaverMapViewManager : SimpleViewManager<GraniteNaverMapView>() {

    override fun getName(): String = "GraniteNaverMapView"

    override fun createViewInstance(reactContext: ThemedReactContext): GraniteNaverMapView {
        return GraniteNaverMapView(reactContext)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put("onInitialized", MapBuilder.of("registrationName", "onInitialized"))
            .put("onCameraChange", MapBuilder.of("registrationName", "onCameraChange"))
            .put("onTouch", MapBuilder.of("registrationName", "onTouch"))
            .put("onMapClick", MapBuilder.of("registrationName", "onMapClick"))
            .put("onMarkerClick", MapBuilder.of("registrationName", "onMarkerClick"))
            .build()
    }

    override fun getCommandsMap(): Map<String, Int>? {
        return MapBuilder.builder<String, Int>()
            .put("animateToCoordinate", COMMAND_ANIMATE_TO_COORDINATE)
            .put("animateToTwoCoordinates", COMMAND_ANIMATE_TO_TWO_COORDINATES)
            .put("animateToRegion", COMMAND_ANIMATE_TO_REGION)
            .put("setLayerGroupEnabled", COMMAND_SET_LAYER_GROUP_ENABLED)
            .put("addMarker", COMMAND_ADD_MARKER)
            .put("updateMarker", COMMAND_UPDATE_MARKER)
            .put("removeMarker", COMMAND_REMOVE_MARKER)
            .put("addPolyline", COMMAND_ADD_POLYLINE)
            .put("updatePolyline", COMMAND_UPDATE_POLYLINE)
            .put("removePolyline", COMMAND_REMOVE_POLYLINE)
            .put("addPolygon", COMMAND_ADD_POLYGON)
            .put("updatePolygon", COMMAND_UPDATE_POLYGON)
            .put("removePolygon", COMMAND_REMOVE_POLYGON)
            .put("addCircle", COMMAND_ADD_CIRCLE)
            .put("updateCircle", COMMAND_UPDATE_CIRCLE)
            .put("removeCircle", COMMAND_REMOVE_CIRCLE)
            .put("addPath", COMMAND_ADD_PATH)
            .put("updatePath", COMMAND_UPDATE_PATH)
            .put("removePath", COMMAND_REMOVE_PATH)
            .put("addArrowheadPath", COMMAND_ADD_ARROWHEAD_PATH)
            .put("updateArrowheadPath", COMMAND_UPDATE_ARROWHEAD_PATH)
            .put("removeArrowheadPath", COMMAND_REMOVE_ARROWHEAD_PATH)
            .put("addGroundOverlay", COMMAND_ADD_GROUND_OVERLAY)
            .put("updateGroundOverlay", COMMAND_UPDATE_GROUND_OVERLAY)
            .put("removeGroundOverlay", COMMAND_REMOVE_GROUND_OVERLAY)
            .put("addInfoWindow", COMMAND_ADD_INFO_WINDOW)
            .put("updateInfoWindow", COMMAND_UPDATE_INFO_WINDOW)
            .put("removeInfoWindow", COMMAND_REMOVE_INFO_WINDOW)
            .build()
    }

    override fun receiveCommand(view: GraniteNaverMapView, commandId: Int, args: ReadableArray?) {
        when (commandId) {
            COMMAND_ANIMATE_TO_COORDINATE -> {
                val coord = args?.getMap(0)
                coord?.let {
                    val lat = it.getDouble("latitude")
                    val lng = it.getDouble("longitude")
                    view.animateToCoordinate(LatLng(lat, lng))
                }
            }
            COMMAND_ANIMATE_TO_TWO_COORDINATES -> {
                val coord1 = args?.getMap(0)
                val coord2 = args?.getMap(1)
                if (coord1 != null && coord2 != null) {
                    val latLng1 = LatLng(coord1.getDouble("latitude"), coord1.getDouble("longitude"))
                    val latLng2 = LatLng(coord2.getDouble("latitude"), coord2.getDouble("longitude"))
                    view.animateToTwoCoordinates(latLng1, latLng2)
                }
            }
            COMMAND_ANIMATE_TO_REGION -> {
                val region = args?.getMap(0)
                region?.let {
                    val lat = it.getDouble("latitude")
                    val lng = it.getDouble("longitude")
                    val latDelta = it.getDouble("latitudeDelta")
                    val lngDelta = it.getDouble("longitudeDelta")
                    val bounds = LatLngBounds(
                        LatLng(lat - latDelta / 2, lng - lngDelta / 2),
                        LatLng(lat + latDelta / 2, lng + lngDelta / 2)
                    )
                    view.animateToRegion(bounds)
                }
            }
            COMMAND_SET_LAYER_GROUP_ENABLED -> {
                val group = args?.getString(0)
                val enabled = args?.getBoolean(1) ?: false
                group?.let { view.setLayerGroupEnabled(it, enabled) }
            }
            COMMAND_ADD_MARKER -> {
                val identifier = args?.getString(0)
                val markerData = args?.getMap(1)
                if (identifier != null && markerData != null) {
                    view.addMarker(identifier, markerData)
                }
            }
            COMMAND_UPDATE_MARKER -> {
                val identifier = args?.getString(0)
                val markerData = args?.getMap(1)
                if (identifier != null && markerData != null) {
                    view.updateMarker(identifier, markerData)
                }
            }
            COMMAND_REMOVE_MARKER -> {
                val identifier = args?.getString(0)
                identifier?.let { view.removeMarker(it) }
            }
        }
    }

    @ReactProp(name = "center")
    fun setCenter(view: GraniteNaverMapView, center: ReadableMap?) {
        center?.let {
            val lat = it.getDouble("latitude")
            val lng = it.getDouble("longitude")
            val zoom = if (it.hasKey("zoom")) it.getDouble("zoom") else 10.0
            val tilt = if (it.hasKey("tilt")) it.getDouble("tilt") else 0.0
            val bearing = if (it.hasKey("bearing")) it.getDouble("bearing") else 0.0

            view.setCenter(CameraPosition(LatLng(lat, lng), zoom, tilt, bearing))
        }
    }

    @ReactProp(name = "showsMyLocationButton")
    fun setShowsMyLocationButton(view: GraniteNaverMapView, show: Boolean) {
        view.setShowsMyLocationButton(show)
    }

    @ReactProp(name = "compass")
    fun setCompass(view: GraniteNaverMapView, show: Boolean) {
        view.setCompass(show)
    }

    @ReactProp(name = "scaleBar")
    fun setScaleBar(view: GraniteNaverMapView, show: Boolean) {
        view.setScaleBar(show)
    }

    @ReactProp(name = "zoomControl")
    fun setZoomControl(view: GraniteNaverMapView, show: Boolean) {
        view.setZoomControl(show)
    }

    @ReactProp(name = "mapType")
    fun setMapType(view: GraniteNaverMapView, mapType: Int) {
        view.setMapType(mapType)
    }

    @ReactProp(name = "buildingHeight", defaultFloat = 1f)
    fun setBuildingHeight(view: GraniteNaverMapView, height: Float) {
        view.setBuildingHeight(height)
    }

    @ReactProp(name = "nightMode")
    fun setNightMode(view: GraniteNaverMapView, enabled: Boolean) {
        view.setNightMode(enabled)
    }

    @ReactProp(name = "minZoomLevel", defaultDouble = 0.0)
    fun setMinZoomLevel(view: GraniteNaverMapView, level: Double) {
        view.setMinZoomLevel(level)
    }

    @ReactProp(name = "maxZoomLevel", defaultDouble = 21.0)
    fun setMaxZoomLevel(view: GraniteNaverMapView, level: Double) {
        view.setMaxZoomLevel(level)
    }

    @ReactProp(name = "scrollGesturesEnabled", defaultBoolean = true)
    fun setScrollGesturesEnabled(view: GraniteNaverMapView, enabled: Boolean) {
        view.setScrollGesturesEnabled(enabled)
    }

    @ReactProp(name = "zoomGesturesEnabled", defaultBoolean = true)
    fun setZoomGesturesEnabled(view: GraniteNaverMapView, enabled: Boolean) {
        view.setZoomGesturesEnabled(enabled)
    }

    @ReactProp(name = "tiltGesturesEnabled", defaultBoolean = true)
    fun setTiltGesturesEnabled(view: GraniteNaverMapView, enabled: Boolean) {
        view.setTiltGesturesEnabled(enabled)
    }

    @ReactProp(name = "rotateGesturesEnabled", defaultBoolean = true)
    fun setRotateGesturesEnabled(view: GraniteNaverMapView, enabled: Boolean) {
        view.setRotateGesturesEnabled(enabled)
    }

    @ReactProp(name = "stopGesturesEnabled", defaultBoolean = true)
    fun setStopGesturesEnabled(view: GraniteNaverMapView, enabled: Boolean) {
        view.setStopGesturesEnabled(enabled)
    }

    @ReactProp(name = "locationTrackingMode")
    fun setLocationTrackingMode(view: GraniteNaverMapView, mode: Int) {
        view.setLocationTrackingMode(mode)
    }

    @ReactProp(name = "mapPadding")
    fun setMapPadding(view: GraniteNaverMapView, padding: ReadableMap?) {
        padding?.let {
            val top = if (it.hasKey("top")) it.getInt("top") else 0
            val left = if (it.hasKey("left")) it.getInt("left") else 0
            val bottom = if (it.hasKey("bottom")) it.getInt("bottom") else 0
            val right = if (it.hasKey("right")) it.getInt("right") else 0
            view.setMapPadding(top, left, bottom, right)
        }
    }

    companion object {
        private const val COMMAND_ANIMATE_TO_COORDINATE = 1
        private const val COMMAND_ANIMATE_TO_TWO_COORDINATES = 2
        private const val COMMAND_ANIMATE_TO_REGION = 3
        private const val COMMAND_SET_LAYER_GROUP_ENABLED = 4
        private const val COMMAND_ADD_MARKER = 5
        private const val COMMAND_UPDATE_MARKER = 6
        private const val COMMAND_REMOVE_MARKER = 7
        private const val COMMAND_ADD_POLYLINE = 8
        private const val COMMAND_UPDATE_POLYLINE = 9
        private const val COMMAND_REMOVE_POLYLINE = 10
        private const val COMMAND_ADD_POLYGON = 11
        private const val COMMAND_UPDATE_POLYGON = 12
        private const val COMMAND_REMOVE_POLYGON = 13
        private const val COMMAND_ADD_CIRCLE = 14
        private const val COMMAND_UPDATE_CIRCLE = 15
        private const val COMMAND_REMOVE_CIRCLE = 16
        private const val COMMAND_ADD_PATH = 17
        private const val COMMAND_UPDATE_PATH = 18
        private const val COMMAND_REMOVE_PATH = 19
        private const val COMMAND_ADD_ARROWHEAD_PATH = 20
        private const val COMMAND_UPDATE_ARROWHEAD_PATH = 21
        private const val COMMAND_REMOVE_ARROWHEAD_PATH = 22
        private const val COMMAND_ADD_GROUND_OVERLAY = 23
        private const val COMMAND_UPDATE_GROUND_OVERLAY = 24
        private const val COMMAND_REMOVE_GROUND_OVERLAY = 25
        private const val COMMAND_ADD_INFO_WINDOW = 26
        private const val COMMAND_UPDATE_INFO_WINDOW = 27
        private const val COMMAND_REMOVE_INFO_WINDOW = 28
    }
}
