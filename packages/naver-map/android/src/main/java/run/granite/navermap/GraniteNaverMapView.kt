package run.granite.navermap

import android.content.Context
import android.util.Log
import android.widget.FrameLayout
import android.widget.TextView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter

/**
 * Provider-based NaverMapView implementation (no direct NMapsMap dependency)
 */
class GraniteNaverMapView(context: Context) : FrameLayout(context), LifecycleEventListener, GraniteNaverMapProviderDelegate {

    companion object {
        private const val TAG = "GraniteNaverMapView"
        private var instanceCounter = 0
    }

    private val instanceId = ++instanceCounter
    private val reactContext: ReactContext = context as ReactContext

    private var provider: GraniteNaverMapProvider? = null
    private var mapContentView: android.view.View? = null
    private var mapInitialized = false

    init {
        Log.d(TAG, "GraniteNaverMapView init")
        setupProvider()
    }

    private fun setupProvider() {
        // Create a new provider instance for this view
        val mapProvider = GraniteNaverMapRegistry.createProvider(context)

        if (mapProvider == null) {
            // No provider factory available - show placeholder
            Log.w(TAG, "No NaverMap provider factory registered")
            val label = TextView(context).apply {
                text = "NaverMap provider not registered"
                textAlignment = TEXT_ALIGNMENT_CENTER
            }
            addView(label, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
            return
        }

        provider = mapProvider
        mapProvider.setDelegate(this)

        val mapView = mapProvider.createMapView(context)
        mapContentView = mapView
        addView(mapView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        Log.d(TAG, "GraniteNaverMapView[$instanceId] - MapView added via provider")
    }

    // Fabric requires explicit layout of children
    override fun requestLayout() {
        super.requestLayout()
        post(measureAndLayout)
    }

    private val measureAndLayout = Runnable {
        measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        )
        layout(left, top, right, bottom)
    }

    override fun onAttachedToWindow() {
        Log.d(TAG, "onAttachedToWindow")
        super.onAttachedToWindow()
        reactContext.addLifecycleEventListener(this)
        provider?.onAttachedToWindow()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        Log.d(TAG, "onSizeChanged: ${w}x${h} (was ${oldw}x${oldh})")
        provider?.onSizeChanged(w, h)
    }

    override fun onDetachedFromWindow() {
        Log.d(TAG, "onDetachedFromWindow")
        reactContext.removeLifecycleEventListener(this)
        provider?.onDetachedFromWindow()
        super.onDetachedFromWindow()
    }

    override fun onHostResume() {
        Log.d(TAG, "onHostResume")
        provider?.onHostResume()
    }

    override fun onHostPause() {
        Log.d(TAG, "onHostPause")
        provider?.onHostPause()
    }

    override fun onHostDestroy() {
        Log.d(TAG, "onHostDestroy")
    }

    // MARK: - GraniteNaverMapProviderDelegate

    override fun onMapInitialized() {
        sendEvent("onInitialized", Arguments.createMap())
    }

    override fun onCameraChange(position: GraniteNaverMapCameraPosition, contentRegion: List<GraniteNaverMapCoordinate>, coveringRegion: List<GraniteNaverMapCoordinate>) {
        val event = Arguments.createMap().apply {
            putDouble("latitude", position.target.latitude)
            putDouble("longitude", position.target.longitude)
            putDouble("zoom", position.zoom)

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
        sendEvent("onCameraChange", event)
    }

    override fun onTouch(reason: Int, animated: Boolean) {
        val event = Arguments.createMap().apply {
            putInt("reason", reason)
            putBoolean("animated", animated)
        }
        sendEvent("onTouch", event)
    }

    override fun onClick(x: Double, y: Double, latitude: Double, longitude: Double) {
        val event = Arguments.createMap().apply {
            putDouble("x", x)
            putDouble("y", y)
            putDouble("latitude", latitude)
            putDouble("longitude", longitude)
        }
        sendEvent("onMapClick", event)
    }

    override fun onMarkerClick(id: String) {
        val event = Arguments.createMap().apply {
            putString("id", id)
        }
        sendEvent("onMarkerClick", event)
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext.getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, eventName, params)
    }

    // MARK: - Camera Methods

    fun setCenter(latitude: Double, longitude: Double, zoom: Double, tilt: Double, bearing: Double) {
        val position = GraniteNaverMapCameraPosition(
            target = GraniteNaverMapCoordinate(latitude, longitude),
            zoom = zoom,
            tilt = tilt,
            bearing = bearing
        )
        provider?.moveCamera(position, true)
    }

    fun animateToCoordinate(latitude: Double, longitude: Double) {
        provider?.animateToCoordinate(GraniteNaverMapCoordinate(latitude, longitude))
    }

    fun animateToTwoCoordinates(lat1: Double, lng1: Double, lat2: Double, lng2: Double) {
        val bounds = GraniteNaverMapBounds(
            southWest = GraniteNaverMapCoordinate(minOf(lat1, lat2), minOf(lng1, lng2)),
            northEast = GraniteNaverMapCoordinate(maxOf(lat1, lat2), maxOf(lng1, lng2))
        )
        provider?.animateToBounds(bounds, 24)
    }

    fun animateToRegion(latitude: Double, longitude: Double, latitudeDelta: Double, longitudeDelta: Double) {
        val bounds = GraniteNaverMapBounds(
            southWest = GraniteNaverMapCoordinate(latitude - latitudeDelta / 2, longitude - longitudeDelta / 2),
            northEast = GraniteNaverMapCoordinate(latitude + latitudeDelta / 2, longitude + longitudeDelta / 2)
        )
        provider?.animateToBounds(bounds, 0)
    }

    // MARK: - Map Properties

    fun setLayerGroupEnabled(group: String, enabled: Boolean) {
        provider?.setLayerGroupEnabled(group, enabled)
    }

    fun setShowsMyLocationButton(show: Boolean) {
        provider?.setLocationButtonEnabled(show)
    }

    fun setCompass(show: Boolean) {
        provider?.setCompassEnabled(show)
    }

    fun setScaleBar(show: Boolean) {
        provider?.setScaleBarEnabled(show)
    }

    fun setZoomControl(show: Boolean) {
        provider?.setZoomControlEnabled(show)
    }

    fun setMapType(type: Int) {
        val mapType = GraniteNaverMapType.values().getOrElse(type) { GraniteNaverMapType.BASIC }
        provider?.setMapType(mapType)
    }

    fun setBuildingHeight(height: Float) {
        provider?.setBuildingHeight(height)
    }

    fun setNightMode(enabled: Boolean) {
        provider?.setNightModeEnabled(enabled)
    }

    fun setMinZoomLevel(level: Double) {
        provider?.setMinZoomLevel(level)
    }

    fun setMaxZoomLevel(level: Double) {
        provider?.setMaxZoomLevel(level)
    }

    fun setScrollGesturesEnabled(enabled: Boolean) {
        provider?.setScrollGesturesEnabled(enabled)
    }

    fun setZoomGesturesEnabled(enabled: Boolean) {
        provider?.setZoomGesturesEnabled(enabled)
    }

    fun setTiltGesturesEnabled(enabled: Boolean) {
        provider?.setTiltGesturesEnabled(enabled)
    }

    fun setRotateGesturesEnabled(enabled: Boolean) {
        provider?.setRotateGesturesEnabled(enabled)
    }

    fun setStopGesturesEnabled(enabled: Boolean) {
        provider?.setStopGesturesEnabled(enabled)
    }

    fun setLocationTrackingMode(mode: Int) {
        val trackingMode = GraniteNaverMapLocationTrackingMode.values().getOrElse(mode) { GraniteNaverMapLocationTrackingMode.NONE }
        provider?.setLocationTrackingMode(trackingMode)
    }

    fun setMapPadding(top: Int, left: Int, bottom: Int, right: Int) {
        provider?.setMapPadding(top, left, bottom, right)
    }

    // MARK: - Marker Methods (Old Architecture - ReadableMap)

    fun addMarker(identifier: String, markerData: ReadableMap) {
        val data = parseMarkerData(identifier, markerData)
        provider?.addMarker(data)
    }

    fun updateMarker(identifier: String, markerData: ReadableMap) {
        val data = parseMarkerData(identifier, markerData)
        provider?.updateMarker(data)
    }

    fun removeMarker(identifier: String) {
        provider?.removeMarker(identifier)
    }

    private fun parseMarkerData(identifier: String, data: ReadableMap): GraniteNaverMapMarkerData {
        val coord = data.getMap("coordinate")
        return GraniteNaverMapMarkerData(
            identifier = identifier,
            coordinate = GraniteNaverMapCoordinate(
                latitude = coord?.getDouble("latitude") ?: 0.0,
                longitude = coord?.getDouble("longitude") ?: 0.0
            ),
            width = if (data.hasKey("width")) data.getInt("width") else 0,
            height = if (data.hasKey("height")) data.getInt("height") else 0,
            zIndex = if (data.hasKey("zIndex")) data.getInt("zIndex") else 0,
            rotation = if (data.hasKey("rotation")) data.getDouble("rotation").toFloat() else 0f,
            flat = if (data.hasKey("flat")) data.getBoolean("flat") else false,
            alpha = if (data.hasKey("alpha")) data.getDouble("alpha").toFloat() else 1f,
            pinColor = if (data.hasKey("pinColor")) data.getInt("pinColor") else 0,
            image = if (data.hasKey("image")) data.getString("image") ?: "" else ""
        )
    }

    // MARK: - Marker Methods (New Architecture - direct params)

    fun addMarkerNew(
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
        Log.d(TAG, "[$instanceId] addMarkerNew: id=$identifier")
        val data = GraniteNaverMapMarkerData(
            identifier = identifier,
            coordinate = GraniteNaverMapCoordinate(latitude, longitude),
            width = width,
            height = height,
            zIndex = zIndex,
            rotation = rotation,
            flat = flat,
            alpha = alpha,
            pinColor = pinColor,
            image = image
        )
        provider?.addMarker(data)
    }

    fun updateMarkerNew(
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
        val data = GraniteNaverMapMarkerData(
            identifier = identifier,
            coordinate = GraniteNaverMapCoordinate(latitude, longitude),
            width = width,
            height = height,
            zIndex = zIndex,
            rotation = rotation,
            flat = flat,
            alpha = alpha,
            pinColor = pinColor,
            image = image
        )
        provider?.updateMarker(data)
    }

    // MARK: - Polyline Methods

    fun addPolyline(
        identifier: String,
        coordsJson: String,
        strokeWidth: Float,
        strokeColor: Int,
        zIndex: Int,
        lineCap: Int,
        lineJoin: Int,
        patternJson: String
    ) {
        Log.d(TAG, "addPolyline: id=$identifier")
        val coords = parseCoordinatesJson(coordsJson)
        if (coords.size < 2) return

        val data = GraniteNaverMapPolylineData(
            identifier = identifier,
            coordinates = coords,
            strokeWidth = strokeWidth,
            strokeColor = strokeColor,
            zIndex = zIndex,
            lineCap = lineCap,
            lineJoin = lineJoin,
            pattern = parsePatternJson(patternJson)
        )
        provider?.addPolyline(data)
    }

    fun updatePolyline(
        identifier: String,
        coordsJson: String,
        strokeWidth: Float,
        strokeColor: Int,
        zIndex: Int,
        lineCap: Int,
        lineJoin: Int,
        patternJson: String
    ) {
        val coords = parseCoordinatesJson(coordsJson)
        if (coords.size < 2) return

        val data = GraniteNaverMapPolylineData(
            identifier = identifier,
            coordinates = coords,
            strokeWidth = strokeWidth,
            strokeColor = strokeColor,
            zIndex = zIndex,
            lineCap = lineCap,
            lineJoin = lineJoin,
            pattern = parsePatternJson(patternJson)
        )
        provider?.updatePolyline(data)
    }

    fun removePolyline(identifier: String) {
        provider?.removePolyline(identifier)
    }

    // MARK: - Polygon Methods

    fun addPolygon(
        identifier: String,
        coordsJson: String,
        holesJson: String,
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        Log.d(TAG, "addPolygon: id=$identifier")
        val coords = parseCoordinatesJson(coordsJson)
        if (coords.size < 3) return

        val data = GraniteNaverMapPolygonData(
            identifier = identifier,
            coordinates = coords,
            holes = parseHolesJson(holesJson),
            fillColor = fillColor,
            strokeColor = strokeColor,
            strokeWidth = strokeWidth,
            zIndex = zIndex
        )
        provider?.addPolygon(data)
    }

    fun updatePolygon(
        identifier: String,
        coordsJson: String,
        holesJson: String,
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        val coords = parseCoordinatesJson(coordsJson)
        if (coords.size < 3) return

        val data = GraniteNaverMapPolygonData(
            identifier = identifier,
            coordinates = coords,
            holes = parseHolesJson(holesJson),
            fillColor = fillColor,
            strokeColor = strokeColor,
            strokeWidth = strokeWidth,
            zIndex = zIndex
        )
        provider?.updatePolygon(data)
    }

    fun removePolygon(identifier: String) {
        provider?.removePolygon(identifier)
    }

    // MARK: - Circle Methods

    fun addCircle(
        identifier: String,
        latitude: Double,
        longitude: Double,
        radius: Double,
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        Log.d(TAG, "addCircle: id=$identifier")
        val data = GraniteNaverMapCircleData(
            identifier = identifier,
            center = GraniteNaverMapCoordinate(latitude, longitude),
            radius = radius,
            fillColor = fillColor,
            strokeColor = strokeColor,
            strokeWidth = strokeWidth,
            zIndex = zIndex
        )
        provider?.addCircle(data)
    }

    fun updateCircle(
        identifier: String,
        latitude: Double,
        longitude: Double,
        radius: Double,
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        val data = GraniteNaverMapCircleData(
            identifier = identifier,
            center = GraniteNaverMapCoordinate(latitude, longitude),
            radius = radius,
            fillColor = fillColor,
            strokeColor = strokeColor,
            strokeWidth = strokeWidth,
            zIndex = zIndex
        )
        provider?.updateCircle(data)
    }

    fun removeCircle(identifier: String) {
        provider?.removeCircle(identifier)
    }

    // MARK: - Path Methods

    fun addPath(
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
        Log.d(TAG, "addPath: id=$identifier")
        val coords = parseCoordinatesJson(coordsJson)
        if (coords.size < 2) return

        val data = GraniteNaverMapPathData(
            identifier = identifier,
            coordinates = coords,
            width = width,
            outlineWidth = outlineWidth,
            color = color,
            outlineColor = outlineColor,
            passedColor = passedColor,
            passedOutlineColor = passedOutlineColor,
            patternImage = patternImage,
            patternInterval = patternInterval,
            progress = progress,
            zIndex = zIndex
        )
        provider?.addPath(data)
    }

    fun updatePath(
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
        val coords = parseCoordinatesJson(coordsJson)
        if (coords.size < 2) return

        val data = GraniteNaverMapPathData(
            identifier = identifier,
            coordinates = coords,
            width = width,
            outlineWidth = outlineWidth,
            color = color,
            outlineColor = outlineColor,
            passedColor = passedColor,
            passedOutlineColor = passedOutlineColor,
            patternImage = patternImage,
            patternInterval = patternInterval,
            progress = progress,
            zIndex = zIndex
        )
        provider?.updatePath(data)
    }

    fun removePath(identifier: String) {
        provider?.removePath(identifier)
    }

    // MARK: - ArrowheadPath Methods (delegated to Path)

    fun addArrowheadPath(
        identifier: String,
        coordsJson: String,
        width: Float,
        outlineWidth: Float,
        color: Int,
        outlineColor: Int,
        headSizeRatio: Float,
        zIndex: Int
    ) {
        // ArrowheadPath uses Path API with default passed colors
        addPath(identifier, coordsJson, width, outlineWidth, color, outlineColor, color, outlineColor, "", 0, 0f, zIndex)
    }

    fun updateArrowheadPath(
        identifier: String,
        coordsJson: String,
        width: Float,
        outlineWidth: Float,
        color: Int,
        outlineColor: Int,
        headSizeRatio: Float,
        zIndex: Int
    ) {
        updatePath(identifier, coordsJson, width, outlineWidth, color, outlineColor, color, outlineColor, "", 0, 0f, zIndex)
    }

    fun removeArrowheadPath(identifier: String) {
        removePath(identifier)
    }

    // MARK: - GroundOverlay Methods (TODO: Add to provider protocol)

    fun addGroundOverlay(
        identifier: String,
        swLat: Double,
        swLng: Double,
        neLat: Double,
        neLng: Double,
        image: String,
        alpha: Float,
        zIndex: Int
    ) {
        // TODO: Add ground overlay support to provider protocol
    }

    fun updateGroundOverlay(
        identifier: String,
        swLat: Double,
        swLng: Double,
        neLat: Double,
        neLng: Double,
        image: String,
        alpha: Float,
        zIndex: Int
    ) {
        // TODO: Add ground overlay support to provider protocol
    }

    fun removeGroundOverlay(identifier: String) {
        // TODO: Add ground overlay support to provider protocol
    }

    // MARK: - InfoWindow Methods (TODO: Add to provider protocol)

    fun addInfoWindow(
        identifier: String,
        latitude: Double,
        longitude: Double,
        text: String,
        alpha: Float,
        zIndex: Int,
        offsetX: Int,
        offsetY: Int
    ) {
        // TODO: Add info window support to provider protocol
    }

    fun updateInfoWindow(
        identifier: String,
        latitude: Double,
        longitude: Double,
        text: String,
        alpha: Float,
        zIndex: Int,
        offsetX: Int,
        offsetY: Int
    ) {
        // TODO: Add info window support to provider protocol
    }

    fun removeInfoWindow(identifier: String) {
        // TODO: Add info window support to provider protocol
    }

    // MARK: - JSON Parsing Helpers

    private fun parseCoordinatesJson(json: String): List<GraniteNaverMapCoordinate> {
        val result = mutableListOf<GraniteNaverMapCoordinate>()
        try {
            val array = org.json.JSONArray(json)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                result.add(GraniteNaverMapCoordinate(
                    latitude = obj.getDouble("latitude"),
                    longitude = obj.getDouble("longitude")
                ))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return result
    }

    private fun parseHolesJson(json: String): List<List<GraniteNaverMapCoordinate>> {
        val result = mutableListOf<List<GraniteNaverMapCoordinate>>()
        try {
            val array = org.json.JSONArray(json)
            for (i in 0 until array.length()) {
                val holeArray = array.getJSONArray(i)
                val hole = mutableListOf<GraniteNaverMapCoordinate>()
                for (j in 0 until holeArray.length()) {
                    val obj = holeArray.getJSONObject(j)
                    hole.add(GraniteNaverMapCoordinate(
                        latitude = obj.getDouble("latitude"),
                        longitude = obj.getDouble("longitude")
                    ))
                }
                result.add(hole)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return result
    }

    private fun parsePatternJson(json: String): List<Int> {
        val result = mutableListOf<Int>()
        try {
            val array = org.json.JSONArray(json)
            for (i in 0 until array.length()) {
                result.add(array.getInt(i))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return result
    }
}
