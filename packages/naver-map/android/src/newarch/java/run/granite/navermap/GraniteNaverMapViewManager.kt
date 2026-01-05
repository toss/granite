package run.granite.navermap

import android.util.Log
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.GraniteNaverMapViewManagerDelegate
import com.facebook.react.viewmanagers.GraniteNaverMapViewManagerInterface
import com.naver.maps.geometry.LatLng
import com.naver.maps.geometry.LatLngBounds
import com.naver.maps.map.CameraPosition

@ReactModule(name = GraniteNaverMapViewManager.NAME)
class GraniteNaverMapViewManager : SimpleViewManager<GraniteNaverMapView>(),
    GraniteNaverMapViewManagerInterface<GraniteNaverMapView> {

    private val delegate = GraniteNaverMapViewManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<GraniteNaverMapView> = delegate

    override fun getName(): String = NAME

    override fun createViewInstance(reactContext: ThemedReactContext): GraniteNaverMapView {
        Log.d(NAME, "Creating GraniteNaverMapView instance")
        return GraniteNaverMapView(reactContext)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return mapOf(
            "onInitialized" to mapOf("registrationName" to "onInitialized"),
            "onCameraChange" to mapOf("registrationName" to "onCameraChange"),
            "onTouch" to mapOf("registrationName" to "onTouch"),
            "onMapClick" to mapOf("registrationName" to "onMapClick"),
            "onMarkerClick" to mapOf("registrationName" to "onMarkerClick")
        )
    }

    // Props
    @ReactProp(name = "center")
    override fun setCenter(view: GraniteNaverMapView, center: ReadableMap?) {
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
    override fun setShowsMyLocationButton(view: GraniteNaverMapView, show: Boolean) {
        view.setShowsMyLocationButton(show)
    }

    @ReactProp(name = "compass")
    override fun setCompass(view: GraniteNaverMapView, show: Boolean) {
        view.setCompass(show)
    }

    @ReactProp(name = "scaleBar")
    override fun setScaleBar(view: GraniteNaverMapView, show: Boolean) {
        view.setScaleBar(show)
    }

    @ReactProp(name = "zoomControl")
    override fun setZoomControl(view: GraniteNaverMapView, show: Boolean) {
        view.setZoomControl(show)
    }

    @ReactProp(name = "mapType")
    override fun setMapType(view: GraniteNaverMapView, mapType: Int) {
        view.setMapType(mapType)
    }

    @ReactProp(name = "buildingHeight", defaultFloat = 1f)
    override fun setBuildingHeight(view: GraniteNaverMapView, height: Float) {
        view.setBuildingHeight(height)
    }

    @ReactProp(name = "nightMode")
    override fun setNightMode(view: GraniteNaverMapView, enabled: Boolean) {
        view.setNightMode(enabled)
    }

    @ReactProp(name = "minZoomLevel", defaultDouble = 0.0)
    override fun setMinZoomLevel(view: GraniteNaverMapView, level: Double) {
        view.setMinZoomLevel(level)
    }

    @ReactProp(name = "maxZoomLevel", defaultDouble = 21.0)
    override fun setMaxZoomLevel(view: GraniteNaverMapView, level: Double) {
        view.setMaxZoomLevel(level)
    }

    @ReactProp(name = "scrollGesturesEnabled", defaultBoolean = true)
    override fun setScrollGesturesEnabled(view: GraniteNaverMapView, enabled: Boolean) {
        view.setScrollGesturesEnabled(enabled)
    }

    @ReactProp(name = "zoomGesturesEnabled", defaultBoolean = true)
    override fun setZoomGesturesEnabled(view: GraniteNaverMapView, enabled: Boolean) {
        view.setZoomGesturesEnabled(enabled)
    }

    @ReactProp(name = "tiltGesturesEnabled", defaultBoolean = true)
    override fun setTiltGesturesEnabled(view: GraniteNaverMapView, enabled: Boolean) {
        view.setTiltGesturesEnabled(enabled)
    }

    @ReactProp(name = "rotateGesturesEnabled", defaultBoolean = true)
    override fun setRotateGesturesEnabled(view: GraniteNaverMapView, enabled: Boolean) {
        view.setRotateGesturesEnabled(enabled)
    }

    @ReactProp(name = "stopGesturesEnabled", defaultBoolean = true)
    override fun setStopGesturesEnabled(view: GraniteNaverMapView, enabled: Boolean) {
        view.setStopGesturesEnabled(enabled)
    }

    @ReactProp(name = "locationTrackingMode")
    override fun setLocationTrackingMode(view: GraniteNaverMapView, mode: Int) {
        view.setLocationTrackingMode(mode)
    }

    @ReactProp(name = "mapPadding")
    override fun setMapPadding(view: GraniteNaverMapView, padding: ReadableMap?) {
        padding?.let {
            val top = if (it.hasKey("top")) it.getInt("top") else 0
            val left = if (it.hasKey("left")) it.getInt("left") else 0
            val bottom = if (it.hasKey("bottom")) it.getInt("bottom") else 0
            val right = if (it.hasKey("right")) it.getInt("right") else 0
            view.setMapPadding(top, left, bottom, right)
        }
    }

    // Commands
    override fun animateToCoordinate(view: GraniteNaverMapView, latitude: Double, longitude: Double) {
        view.animateToCoordinate(LatLng(latitude, longitude))
    }

    override fun animateToTwoCoordinates(
        view: GraniteNaverMapView,
        lat1: Double,
        lng1: Double,
        lat2: Double,
        lng2: Double
    ) {
        view.animateToTwoCoordinates(LatLng(lat1, lng1), LatLng(lat2, lng2))
    }

    override fun animateToRegion(
        view: GraniteNaverMapView,
        latitude: Double,
        longitude: Double,
        latitudeDelta: Double,
        longitudeDelta: Double
    ) {
        val bounds = LatLngBounds(
            LatLng(latitude - latitudeDelta / 2, longitude - longitudeDelta / 2),
            LatLng(latitude + latitudeDelta / 2, longitude + longitudeDelta / 2)
        )
        view.animateToRegion(bounds)
    }

    override fun setLayerGroupEnabled(view: GraniteNaverMapView, group: String, enabled: Boolean) {
        view.setLayerGroupEnabled(group, enabled)
    }

    override fun addMarker(
        view: GraniteNaverMapView,
        identifier: String,
        latitude: Double,
        longitude: Double,
        width: Int,
        height: Int,
        zIndex: Int,
        rotation: Float,
        flat: Boolean,
        alpha: Float,
        pinColor: Int,
        image: String
    ) {
        Log.d(NAME, "addMarker called: id=$identifier, lat=$latitude, lng=$longitude")
        view.addMarkerNew(identifier, latitude, longitude, width, height, zIndex, rotation, flat, alpha, pinColor, image)
    }

    override fun updateMarker(
        view: GraniteNaverMapView,
        identifier: String,
        latitude: Double,
        longitude: Double,
        width: Int,
        height: Int,
        zIndex: Int,
        rotation: Float,
        flat: Boolean,
        alpha: Float,
        pinColor: Int,
        image: String
    ) {
        view.updateMarkerNew(identifier, latitude, longitude, width, height, zIndex, rotation, flat, alpha, pinColor, image)
    }

    override fun removeMarker(view: GraniteNaverMapView, identifier: String) {
        view.removeMarker(identifier)
    }

    // Polyline Commands
    override fun addPolyline(
        view: GraniteNaverMapView,
        identifier: String,
        coordsJson: String,
        strokeWidth: Float,
        strokeColor: Int,
        zIndex: Int,
        lineCap: Int,
        lineJoin: Int,
        patternJson: String
    ) {
        view.addPolyline(identifier, coordsJson, strokeWidth, strokeColor, zIndex, lineCap, lineJoin, patternJson)
    }

    override fun updatePolyline(
        view: GraniteNaverMapView,
        identifier: String,
        coordsJson: String,
        strokeWidth: Float,
        strokeColor: Int,
        zIndex: Int,
        lineCap: Int,
        lineJoin: Int,
        patternJson: String
    ) {
        view.updatePolyline(identifier, coordsJson, strokeWidth, strokeColor, zIndex, lineCap, lineJoin, patternJson)
    }

    override fun removePolyline(view: GraniteNaverMapView, identifier: String) {
        view.removePolyline(identifier)
    }

    // Polygon Commands
    override fun addPolygon(
        view: GraniteNaverMapView,
        identifier: String,
        coordsJson: String,
        holesJson: String,
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        view.addPolygon(identifier, coordsJson, holesJson, fillColor, strokeColor, strokeWidth, zIndex)
    }

    override fun updatePolygon(
        view: GraniteNaverMapView,
        identifier: String,
        coordsJson: String,
        holesJson: String,
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        view.updatePolygon(identifier, coordsJson, holesJson, fillColor, strokeColor, strokeWidth, zIndex)
    }

    override fun removePolygon(view: GraniteNaverMapView, identifier: String) {
        view.removePolygon(identifier)
    }

    // Circle Commands
    override fun addCircle(
        view: GraniteNaverMapView,
        identifier: String,
        latitude: Double,
        longitude: Double,
        radius: Double,
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        view.addCircle(identifier, latitude, longitude, radius, fillColor, strokeColor, strokeWidth, zIndex)
    }

    override fun updateCircle(
        view: GraniteNaverMapView,
        identifier: String,
        latitude: Double,
        longitude: Double,
        radius: Double,
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        view.updateCircle(identifier, latitude, longitude, radius, fillColor, strokeColor, strokeWidth, zIndex)
    }

    override fun removeCircle(view: GraniteNaverMapView, identifier: String) {
        view.removeCircle(identifier)
    }

    // Path Commands
    override fun addPath(
        view: GraniteNaverMapView,
        identifier: String,
        coordsJson: String,
        width: Float,
        outlineWidth: Float,
        color: Int,
        outlineColor: Int,
        passedColor: Int,
        passedOutlineColor: Int,
        patternImage: String,
        patternInterval: Int,
        progress: Float,
        zIndex: Int
    ) {
        view.addPath(identifier, coordsJson, width, outlineWidth, color, outlineColor, passedColor, passedOutlineColor, patternImage, patternInterval, progress, zIndex)
    }

    override fun updatePath(
        view: GraniteNaverMapView,
        identifier: String,
        coordsJson: String,
        width: Float,
        outlineWidth: Float,
        color: Int,
        outlineColor: Int,
        passedColor: Int,
        passedOutlineColor: Int,
        patternImage: String,
        patternInterval: Int,
        progress: Float,
        zIndex: Int
    ) {
        view.updatePath(identifier, coordsJson, width, outlineWidth, color, outlineColor, passedColor, passedOutlineColor, patternImage, patternInterval, progress, zIndex)
    }

    override fun removePath(view: GraniteNaverMapView, identifier: String) {
        view.removePath(identifier)
    }

    // ArrowheadPath Commands
    override fun addArrowheadPath(
        view: GraniteNaverMapView,
        identifier: String,
        coordsJson: String,
        width: Float,
        outlineWidth: Float,
        color: Int,
        outlineColor: Int,
        headSizeRatio: Float,
        zIndex: Int
    ) {
        view.addArrowheadPath(identifier, coordsJson, width, outlineWidth, color, outlineColor, headSizeRatio, zIndex)
    }

    override fun updateArrowheadPath(
        view: GraniteNaverMapView,
        identifier: String,
        coordsJson: String,
        width: Float,
        outlineWidth: Float,
        color: Int,
        outlineColor: Int,
        headSizeRatio: Float,
        zIndex: Int
    ) {
        view.updateArrowheadPath(identifier, coordsJson, width, outlineWidth, color, outlineColor, headSizeRatio, zIndex)
    }

    override fun removeArrowheadPath(view: GraniteNaverMapView, identifier: String) {
        view.removeArrowheadPath(identifier)
    }

    // GroundOverlay Commands
    override fun addGroundOverlay(
        view: GraniteNaverMapView,
        identifier: String,
        swLat: Double,
        swLng: Double,
        neLat: Double,
        neLng: Double,
        image: String,
        alpha: Float,
        zIndex: Int
    ) {
        view.addGroundOverlay(identifier, swLat, swLng, neLat, neLng, image, alpha, zIndex)
    }

    override fun updateGroundOverlay(
        view: GraniteNaverMapView,
        identifier: String,
        swLat: Double,
        swLng: Double,
        neLat: Double,
        neLng: Double,
        image: String,
        alpha: Float,
        zIndex: Int
    ) {
        view.updateGroundOverlay(identifier, swLat, swLng, neLat, neLng, image, alpha, zIndex)
    }

    override fun removeGroundOverlay(view: GraniteNaverMapView, identifier: String) {
        view.removeGroundOverlay(identifier)
    }

    // InfoWindow Commands
    override fun addInfoWindow(
        view: GraniteNaverMapView,
        identifier: String,
        latitude: Double,
        longitude: Double,
        text: String,
        alpha: Float,
        zIndex: Int,
        offsetX: Int,
        offsetY: Int
    ) {
        view.addInfoWindow(identifier, latitude, longitude, text, alpha, zIndex, offsetX, offsetY)
    }

    override fun updateInfoWindow(
        view: GraniteNaverMapView,
        identifier: String,
        latitude: Double,
        longitude: Double,
        text: String,
        alpha: Float,
        zIndex: Int,
        offsetX: Int,
        offsetY: Int
    ) {
        view.updateInfoWindow(identifier, latitude, longitude, text, alpha, zIndex, offsetX, offsetY)
    }

    override fun removeInfoWindow(view: GraniteNaverMapView, identifier: String) {
        view.removeInfoWindow(identifier)
    }

    companion object {
        const val NAME = "GraniteNaverMapView"
    }
}
