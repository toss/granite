package run.granite.navermap

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.naver.maps.geometry.LatLng
import com.naver.maps.geometry.LatLngBounds
import com.naver.maps.map.CameraAnimation
import com.naver.maps.map.CameraPosition
import com.naver.maps.map.CameraUpdate
import com.naver.maps.map.LocationTrackingMode
import com.naver.maps.map.MapView
import com.naver.maps.map.NaverMap
import com.naver.maps.map.NaverMapOptions
import com.naver.maps.map.overlay.Marker
import com.naver.maps.map.overlay.OverlayImage
import com.naver.maps.map.overlay.PolylineOverlay
import com.naver.maps.map.overlay.PolygonOverlay
import com.naver.maps.map.overlay.CircleOverlay
import com.naver.maps.map.overlay.PathOverlay
import com.naver.maps.map.overlay.ArrowheadPathOverlay
import com.naver.maps.map.overlay.GroundOverlay
import com.naver.maps.map.overlay.InfoWindow
import android.util.Log
import org.json.JSONArray
import java.net.URL
import kotlin.concurrent.thread

class GraniteNaverMapView(context: Context) : FrameLayout(context), LifecycleEventListener {

    companion object {
        private const val TAG = "GraniteNaverMapView"
        private var instanceCounter = 0
    }

    private val instanceId = ++instanceCounter
    private val density = context.resources.displayMetrics.density

    // Convert dp to px for consistent sizing across platforms
    private fun dpToPx(dp: Int): Int = (dp * density).toInt()
    private fun dpToPx(dp: Float): Int = (dp * density).toInt()

    private val mapView: MapView
    private var naverMap: NaverMap? = null
    private var mapReady: Boolean = false
    private val markers: MutableMap<String, Marker> = mutableMapOf()
    private val polylines: MutableMap<String, PolylineOverlay> = mutableMapOf()
    private val polygons: MutableMap<String, PolygonOverlay> = mutableMapOf()
    private val circles: MutableMap<String, CircleOverlay> = mutableMapOf()
    private val paths: MutableMap<String, PathOverlay> = mutableMapOf()
    private val arrowheadPaths: MutableMap<String, ArrowheadPathOverlay> = mutableMapOf()
    private val groundOverlays: MutableMap<String, GroundOverlay> = mutableMapOf()
    private val infoWindows: MutableMap<String, InfoWindow> = mutableMapOf()
    private val reactContext: ReactContext = context as ReactContext

    private val handler = Handler(Looper.getMainLooper())

    init {
        Log.d(TAG, "GraniteNaverMapView init - creating FrameLayout with MapView")
        mapView = MapView(context, NaverMapOptions())
        addView(mapView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        Log.d(TAG, "GraniteNaverMapView init - MapView added")
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

    private var mapInitialized = false

    override fun onAttachedToWindow() {
        Log.d(TAG, "onAttachedToWindow")
        super.onAttachedToWindow()
        reactContext.addLifecycleEventListener(this)
        Log.d(TAG, "onAttachedToWindow - completed")
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        Log.d(TAG, "onSizeChanged: ${w}x${h} (was ${oldw}x${oldh})")

        if (!mapInitialized && w > 0 && h > 0) {
            Log.d(TAG, "onSizeChanged - valid size, initializing map")
            initializeMap()
        }
    }

    private fun initializeMap() {
        if (mapInitialized) return
        mapInitialized = true

        Log.d(TAG, "initializeMap - calling lifecycle methods")
        mapView.onCreate(null)
        mapView.onStart()
        mapView.onResume()

        mapView.getMapAsync { map ->
            Log.d(TAG, "[$instanceId] getMapAsync callback - map ready! naverMap hashCode=${map.hashCode()}")
            naverMap = map
            mapReady = true
            setupMapListeners(map)
            sendEvent("onInitialized", Arguments.createMap())
            Log.d(TAG, "getMapAsync callback - setup complete")
        }
        Log.d(TAG, "initializeMap - getMapAsync requested")
    }

    override fun onDetachedFromWindow() {
        Log.d(TAG, "onDetachedFromWindow")
        reactContext.removeLifecycleEventListener(this)
        mapView.onPause()
        mapView.onStop()
        mapView.onDestroy()
        super.onDetachedFromWindow()
    }

    override fun onHostResume() {
        Log.d(TAG, "onHostResume")
        if (mapReady) {
            mapView.onResume()
        }
    }

    override fun onHostPause() {
        Log.d(TAG, "onHostPause")
        if (mapReady) {
            mapView.onPause()
        }
    }

    override fun onHostDestroy() {
        Log.d(TAG, "onHostDestroy")
    }

    private fun setupMapListeners(map: NaverMap) {
        map.addOnCameraIdleListener {
            val position = map.cameraPosition
            val contentBounds = map.contentBounds
            val coveringBounds = map.coveringBounds

            val event = Arguments.createMap().apply {
                putDouble("latitude", position.target.latitude)
                putDouble("longitude", position.target.longitude)
                putDouble("zoom", position.zoom)

                val contentRegion = Arguments.createArray().apply {
                    pushMap(coordToMap(LatLng(contentBounds.southLatitude, contentBounds.westLongitude)))
                    pushMap(coordToMap(LatLng(contentBounds.southLatitude, contentBounds.eastLongitude)))
                    pushMap(coordToMap(LatLng(contentBounds.northLatitude, contentBounds.eastLongitude)))
                    pushMap(coordToMap(LatLng(contentBounds.northLatitude, contentBounds.westLongitude)))
                }
                putArray("contentRegion", contentRegion)

                val coveringRegion = Arguments.createArray().apply {
                    pushMap(coordToMap(LatLng(coveringBounds.southLatitude, coveringBounds.westLongitude)))
                    pushMap(coordToMap(LatLng(coveringBounds.southLatitude, coveringBounds.eastLongitude)))
                    pushMap(coordToMap(LatLng(coveringBounds.northLatitude, coveringBounds.eastLongitude)))
                    pushMap(coordToMap(LatLng(coveringBounds.northLatitude, coveringBounds.westLongitude)))
                }
                putArray("coveringRegion", coveringRegion)
            }
            sendEvent("onCameraChange", event)
        }

        map.addOnCameraChangeListener { reason, animated ->
            val event = Arguments.createMap().apply {
                putInt("reason", reason)
                putBoolean("animated", animated)
            }
            sendEvent("onTouch", event)
        }

        map.setOnMapClickListener { point, latLng ->
            val event = Arguments.createMap().apply {
                putDouble("x", point.x.toDouble())
                putDouble("y", point.y.toDouble())
                putDouble("latitude", latLng.latitude)
                putDouble("longitude", latLng.longitude)
            }
            sendEvent("onMapClick", event)
        }
    }

    private fun coordToMap(latLng: LatLng): WritableMap {
        return Arguments.createMap().apply {
            putDouble("latitude", latLng.latitude)
            putDouble("longitude", latLng.longitude)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext.getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, eventName, params)
    }

    fun setCenter(position: CameraPosition) {
        naverMap?.moveCamera(CameraUpdate.toCameraPosition(position).animate(CameraAnimation.Easing))
    }

    fun animateToCoordinate(latLng: LatLng) {
        naverMap?.moveCamera(CameraUpdate.scrollTo(latLng).animate(CameraAnimation.Easing))
    }

    fun animateToTwoCoordinates(latLng1: LatLng, latLng2: LatLng) {
        val bounds = LatLngBounds.Builder()
            .include(latLng1)
            .include(latLng2)
            .build()
        naverMap?.moveCamera(CameraUpdate.fitBounds(bounds, 24).animate(CameraAnimation.Easing))
    }

    fun animateToRegion(bounds: LatLngBounds) {
        naverMap?.moveCamera(CameraUpdate.fitBounds(bounds).animate(CameraAnimation.Easing))
    }

    fun setLayerGroupEnabled(group: String, enabled: Boolean) {
        val layerGroup = when (group) {
            "building" -> NaverMap.LAYER_GROUP_BUILDING
            "ctt" -> NaverMap.LAYER_GROUP_TRAFFIC
            "transit" -> NaverMap.LAYER_GROUP_TRANSIT
            "bike" -> NaverMap.LAYER_GROUP_BICYCLE
            "mountain" -> NaverMap.LAYER_GROUP_MOUNTAIN
            "landparcel" -> NaverMap.LAYER_GROUP_CADASTRAL
            else -> return
        }
        naverMap?.setLayerGroupEnabled(layerGroup, enabled)
    }

    fun setShowsMyLocationButton(show: Boolean) {
        naverMap?.uiSettings?.isLocationButtonEnabled = show
    }

    fun setCompass(show: Boolean) {
        naverMap?.uiSettings?.isCompassEnabled = show
    }

    fun setScaleBar(show: Boolean) {
        naverMap?.uiSettings?.isScaleBarEnabled = show
    }

    fun setZoomControl(show: Boolean) {
        naverMap?.uiSettings?.isZoomControlEnabled = show
    }

    fun setMapType(type: Int) {
        naverMap?.mapType = NaverMap.MapType.values().getOrElse(type) { NaverMap.MapType.Basic }
    }

    fun setBuildingHeight(height: Float) {
        naverMap?.buildingHeight = height
    }

    fun setNightMode(enabled: Boolean) {
        naverMap?.isNightModeEnabled = enabled
    }

    fun setMinZoomLevel(level: Double) {
        naverMap?.minZoom = level
    }

    fun setMaxZoomLevel(level: Double) {
        naverMap?.maxZoom = level
    }

    fun setScrollGesturesEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isScrollGesturesEnabled = enabled
    }

    fun setZoomGesturesEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isZoomGesturesEnabled = enabled
    }

    fun setTiltGesturesEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isTiltGesturesEnabled = enabled
    }

    fun setRotateGesturesEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isRotateGesturesEnabled = enabled
    }

    fun setStopGesturesEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isStopGesturesEnabled = enabled
    }

    fun setLocationTrackingMode(mode: Int) {
        naverMap?.locationTrackingMode = LocationTrackingMode.values().getOrElse(mode) { LocationTrackingMode.None }
    }

    fun setMapPadding(top: Int, left: Int, bottom: Int, right: Int) {
        naverMap?.setContentPadding(left, top, right, bottom)
    }

    fun addMarker(identifier: String, markerData: ReadableMap) {
        val map = naverMap ?: return

        val marker = Marker().apply {
            applyMarkerData(markerData)
            setOnClickListener {
                val event = Arguments.createMap().apply {
                    putString("id", identifier)
                }
                sendEvent("onMarkerClick", event)
                true
            }
            this.map = map
        }

        markers[identifier] = marker
    }

    fun updateMarker(identifier: String, markerData: ReadableMap) {
        markers[identifier]?.applyMarkerData(markerData)
    }

    fun removeMarker(identifier: String) {
        markers[identifier]?.map = null
        markers.remove(identifier)
    }

    // New Architecture methods for direct parameter passing
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
        Log.d(TAG, "[$instanceId] addMarkerNew: id=$identifier, naverMap=${if (naverMap != null) "exists (hashCode=${naverMap?.hashCode()})" else "NULL"}")
        val map = naverMap ?: run {
            Log.w(TAG, "addMarkerNew: naverMap is null, cannot add marker $identifier")
            return
        }

        Log.d(TAG, "addMarkerNew: params - width=$width, height=$height, pinColor=$pinColor (hex: ${Integer.toHexString(pinColor)}), alpha=$alpha, rotation=$rotation, flat=$flat, image=$image")

        // Create marker and add to map
        val marker = Marker()
        marker.position = LatLng(latitude, longitude)
        marker.map = map

        // Set other properties
        // Note: Don't set width/height for default icon - causes issues
        // Width/height should only be set when using custom image icons
        if (zIndex != 0) marker.zIndex = zIndex
        if (rotation != 0f) marker.angle = rotation
        marker.isFlat = flat
        marker.alpha = alpha

        // Only apply iconTintColor if it's a valid ARGB color (has alpha)
        if (pinColor != 0 && (pinColor ushr 24) != 0) {
            marker.iconTintColor = pinColor
        }

        if (image.isNotEmpty()) {
            loadMarkerImage(marker, image)
            // Only set size for custom images (convert dp to px)
            if (width > 0) marker.width = dpToPx(width)
            if (height > 0) marker.height = dpToPx(height)
        }

        marker.setOnClickListener {
            val event = Arguments.createMap().apply {
                putString("id", identifier)
            }
            sendEvent("onMarkerClick", event)
            true
        }

        markers[identifier] = marker
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
        markers[identifier]?.apply {
            position = LatLng(latitude, longitude)
            if (width > 0) this.width = dpToPx(width)
            if (height > 0) this.height = dpToPx(height)
            this.zIndex = zIndex
            angle = rotation
            isFlat = flat
            this.alpha = alpha
            if (pinColor != 0) iconTintColor = pinColor
            if (image.isNotEmpty()) loadMarkerImage(this, image)
        }
    }

    private fun Marker.applyMarkerData(data: ReadableMap) {
        if (data.hasKey("coordinate")) {
            val coord = data.getMap("coordinate")
            coord?.let {
                position = LatLng(it.getDouble("latitude"), it.getDouble("longitude"))
            }
        }

        if (data.hasKey("width")) {
            width = data.getInt("width")
        }

        if (data.hasKey("height")) {
            height = data.getInt("height")
        }

        if (data.hasKey("zIndex")) {
            zIndex = data.getInt("zIndex")
        }

        if (data.hasKey("rotation")) {
            angle = data.getDouble("rotation").toFloat()
        }

        if (data.hasKey("flat")) {
            isFlat = data.getBoolean("flat")
        }

        if (data.hasKey("alpha")) {
            alpha = data.getDouble("alpha").toFloat()
        }

        if (data.hasKey("pinColor")) {
            iconTintColor = data.getInt("pinColor")
        }

        if (data.hasKey("image")) {
            val imageUrl = data.getString("image")
            imageUrl?.let { loadMarkerImage(this, it) }
        }
    }

    private fun loadMarkerImage(marker: Marker, url: String) {
        Log.d(TAG, "loadMarkerImage: starting to load image from $url")
        thread {
            try {
                val connection = URL(url).openConnection()
                connection.connect()
                val inputStream = connection.getInputStream()
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()
                Log.d(TAG, "loadMarkerImage: bitmap loaded successfully, size=${bitmap?.width}x${bitmap?.height}")

                post {
                    marker.icon = OverlayImage.fromBitmap(bitmap)
                    Log.d(TAG, "loadMarkerImage: icon set on marker")
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadMarkerImage: failed to load image", e)
                e.printStackTrace()
            }
        }
    }

    // Helper functions
    private fun parseCoordinates(json: String): List<LatLng> {
        val result = mutableListOf<LatLng>()
        try {
            val array = JSONArray(json)
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val lat = obj.getDouble("latitude")
                val lng = obj.getDouble("longitude")
                result.add(LatLng(lat, lng))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return result
    }

    private fun parseHoles(json: String): List<List<LatLng>> {
        val result = mutableListOf<List<LatLng>>()
        try {
            val array = JSONArray(json)
            for (i in 0 until array.length()) {
                val holeArray = array.getJSONArray(i)
                val hole = mutableListOf<LatLng>()
                for (j in 0 until holeArray.length()) {
                    val obj = holeArray.getJSONObject(j)
                    val lat = obj.getDouble("latitude")
                    val lng = obj.getDouble("longitude")
                    hole.add(LatLng(lat, lng))
                }
                result.add(hole)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return result
    }

    private fun parsePattern(json: String): List<Int> {
        val result = mutableListOf<Int>()
        try {
            val array = JSONArray(json)
            for (i in 0 until array.length()) {
                result.add(array.getInt(i))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return result
    }

    private fun colorFromInt(value: Int): Int {
        // Value comes as signed Int32 from JS, convert to Android Color (ARGB)
        // This handles negative values that represent colors with alpha > 0x7F
        return value
    }

    private fun lineCapType(type: Int): PolylineOverlay.LineCap {
        return when (type) {
            1 -> PolylineOverlay.LineCap.Round
            2 -> PolylineOverlay.LineCap.Square
            else -> PolylineOverlay.LineCap.Butt
        }
    }

    private fun lineJoinType(type: Int): PolylineOverlay.LineJoin {
        return when (type) {
            1 -> PolylineOverlay.LineJoin.Round
            2 -> PolylineOverlay.LineJoin.Bevel
            else -> PolylineOverlay.LineJoin.Miter
        }
    }

    // Polyline Commands
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
        Log.d(TAG, "addPolyline: id=$identifier, strokeWidth=$strokeWidth, strokeColor=$strokeColor (hex: ${Integer.toHexString(strokeColor)})")
        val map = naverMap ?: run {
            Log.w(TAG, "addPolyline: naverMap is null")
            return
        }
        val coords = parseCoordinates(coordsJson)
        if (coords.size < 2) return

        val polyline = PolylineOverlay().apply {
            this.coords = coords
            this.width = dpToPx(strokeWidth)
            this.color = colorFromInt(strokeColor)
            this.zIndex = zIndex
            this.capType = lineCapType(lineCap)
            this.joinType = lineJoinType(lineJoin)
            val pattern = parsePattern(patternJson)
            if (pattern.isNotEmpty()) {
                this.setPattern(*pattern.toIntArray())
            }
            this.map = map
        }

        polylines[identifier] = polyline
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
        val polyline = polylines[identifier] ?: return
        val coords = parseCoordinates(coordsJson)
        if (coords.size >= 2) {
            polyline.coords = coords
        }
        polyline.width = dpToPx(strokeWidth)
        polyline.color = colorFromInt(strokeColor)
        polyline.zIndex = zIndex
        polyline.capType = lineCapType(lineCap)
        polyline.joinType = lineJoinType(lineJoin)
        val pattern = parsePattern(patternJson)
        if (pattern.isNotEmpty()) {
            polyline.setPattern(*pattern.toIntArray())
        }
    }

    fun removePolyline(identifier: String) {
        polylines[identifier]?.map = null
        polylines.remove(identifier)
    }

    // Polygon Commands
    fun addPolygon(
        identifier: String,
        coordsJson: String,
        holesJson: String,
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        Log.d(TAG, "addPolygon: id=$identifier, fillColor=$fillColor (hex: ${Integer.toHexString(fillColor)}), strokeColor=$strokeColor")
        val map = naverMap ?: run {
            Log.w(TAG, "addPolygon: naverMap is null")
            return
        }
        val coords = parseCoordinates(coordsJson)
        if (coords.size < 3) return

        val polygon = PolygonOverlay().apply {
            this.coords = coords
            val holes = parseHoles(holesJson)
            if (holes.isNotEmpty()) {
                this.holes = holes
            }
            this.color = colorFromInt(fillColor)
            this.outlineColor = colorFromInt(strokeColor)
            this.outlineWidth = dpToPx(strokeWidth)
            this.zIndex = zIndex
            this.map = map
        }

        polygons[identifier] = polygon
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
        val polygon = polygons[identifier] ?: return
        val coords = parseCoordinates(coordsJson)
        if (coords.size >= 3) {
            polygon.coords = coords
        }
        val holes = parseHoles(holesJson)
        if (holes.isNotEmpty()) {
            polygon.holes = holes
        }
        polygon.color = colorFromInt(fillColor)
        polygon.outlineColor = colorFromInt(strokeColor)
        polygon.outlineWidth = dpToPx(strokeWidth)
        polygon.zIndex = zIndex
    }

    fun removePolygon(identifier: String) {
        polygons[identifier]?.map = null
        polygons.remove(identifier)
    }

    // Circle Commands
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
        Log.d(TAG, "addCircle: id=$identifier, lat=$latitude, lng=$longitude, radius=$radius, fillColor=$fillColor (hex: ${Integer.toHexString(fillColor)})")
        val map = naverMap ?: run {
            Log.w(TAG, "addCircle: naverMap is null")
            return
        }

        val circle = CircleOverlay().apply {
            this.center = LatLng(latitude, longitude)
            this.radius = radius
            this.color = colorFromInt(fillColor)
            this.outlineColor = colorFromInt(strokeColor)
            this.outlineWidth = dpToPx(strokeWidth)
            this.zIndex = zIndex
            this.map = map
        }

        circles[identifier] = circle
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
        val circle = circles[identifier] ?: return
        circle.center = LatLng(latitude, longitude)
        circle.radius = radius
        circle.color = colorFromInt(fillColor)
        circle.outlineColor = colorFromInt(strokeColor)
        circle.outlineWidth = dpToPx(strokeWidth)
        circle.zIndex = zIndex
    }

    fun removeCircle(identifier: String) {
        circles[identifier]?.map = null
        circles.remove(identifier)
    }

    // Path Commands
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
        Log.d(TAG, "addPath: id=$identifier, width=$width, color=$color (hex: ${Integer.toHexString(color)})")
        val map = naverMap ?: run {
            Log.w(TAG, "addPath: naverMap is null")
            return
        }
        val coords = parseCoordinates(coordsJson)
        if (coords.size < 2) return

        val path = PathOverlay().apply {
            this.coords = coords
            this.width = dpToPx(width)
            this.outlineWidth = dpToPx(outlineWidth)
            this.color = colorFromInt(color)
            this.outlineColor = colorFromInt(outlineColor)
            this.passedColor = colorFromInt(passedColor)
            this.passedOutlineColor = colorFromInt(passedOutlineColor)
            this.progress = progress.toDouble()
            this.zIndex = zIndex
            if (patternInterval > 0) {
                this.patternInterval = patternInterval
            }
            this.map = map
        }

        paths[identifier] = path
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
        val path = paths[identifier] ?: return
        val coords = parseCoordinates(coordsJson)
        if (coords.size >= 2) {
            path.coords = coords
        }
        path.width = dpToPx(width)
        path.outlineWidth = dpToPx(outlineWidth)
        path.color = colorFromInt(color)
        path.outlineColor = colorFromInt(outlineColor)
        path.passedColor = colorFromInt(passedColor)
        path.passedOutlineColor = colorFromInt(passedOutlineColor)
        path.progress = progress.toDouble()
        path.zIndex = zIndex
    }

    fun removePath(identifier: String) {
        paths[identifier]?.map = null
        paths.remove(identifier)
    }

    // ArrowheadPath Commands
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
        val map = naverMap ?: return
        val coords = parseCoordinates(coordsJson)
        if (coords.size < 2) return

        val arrowheadPath = ArrowheadPathOverlay().apply {
            this.coords = coords
            this.width = dpToPx(width)
            this.outlineWidth = dpToPx(outlineWidth)
            this.color = colorFromInt(color)
            this.outlineColor = colorFromInt(outlineColor)
            this.headSizeRatio = headSizeRatio
            this.zIndex = zIndex
            this.map = map
        }

        arrowheadPaths[identifier] = arrowheadPath
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
        val arrowheadPath = arrowheadPaths[identifier] ?: return
        val coords = parseCoordinates(coordsJson)
        if (coords.size >= 2) {
            arrowheadPath.coords = coords
        }
        arrowheadPath.width = dpToPx(width)
        arrowheadPath.outlineWidth = dpToPx(outlineWidth)
        arrowheadPath.color = colorFromInt(color)
        arrowheadPath.outlineColor = colorFromInt(outlineColor)
        arrowheadPath.headSizeRatio = headSizeRatio
        arrowheadPath.zIndex = zIndex
    }

    fun removeArrowheadPath(identifier: String) {
        arrowheadPaths[identifier]?.map = null
        arrowheadPaths.remove(identifier)
    }

    // GroundOverlay Commands
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
        val map = naverMap ?: return

        val bounds = LatLngBounds(LatLng(swLat, swLng), LatLng(neLat, neLng))

        val overlay = GroundOverlay().apply {
            this.bounds = bounds
            this.alpha = alpha
            this.zIndex = zIndex
            this.map = map
        }

        groundOverlays[identifier] = overlay

        // Load image asynchronously
        thread {
            try {
                val connection = URL(image).openConnection()
                connection.connect()
                val inputStream = connection.getInputStream()
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()

                post {
                    overlay.image = OverlayImage.fromBitmap(bitmap)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
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
        val overlay = groundOverlays[identifier] ?: return
        overlay.bounds = LatLngBounds(LatLng(swLat, swLng), LatLng(neLat, neLng))
        overlay.alpha = alpha
        overlay.zIndex = zIndex

        // Reload image if needed
        thread {
            try {
                val connection = URL(image).openConnection()
                connection.connect()
                val inputStream = connection.getInputStream()
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()

                post {
                    overlay.image = OverlayImage.fromBitmap(bitmap)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun removeGroundOverlay(identifier: String) {
        groundOverlays[identifier]?.map = null
        groundOverlays.remove(identifier)
    }

    // InfoWindow Commands
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
        val map = naverMap ?: return

        val infoWindow = InfoWindow().apply {
            adapter = object : InfoWindow.DefaultTextAdapter(context) {
                override fun getText(infoWindow: InfoWindow): CharSequence {
                    return text
                }
            }
            position = LatLng(latitude, longitude)
            this.alpha = alpha
            this.offsetX = offsetX
            this.offsetY = offsetY
            this.zIndex = zIndex
            this.open(map)
        }

        infoWindows[identifier] = infoWindow
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
        val infoWindow = infoWindows[identifier] ?: return
        infoWindow.adapter = object : InfoWindow.DefaultTextAdapter(context) {
            override fun getText(infoWindow: InfoWindow): CharSequence {
                return text
            }
        }
        infoWindow.position = LatLng(latitude, longitude)
        infoWindow.alpha = alpha
        infoWindow.offsetX = offsetX
        infoWindow.offsetY = offsetY
        infoWindow.zIndex = zIndex
    }

    fun removeInfoWindow(identifier: String) {
        infoWindows[identifier]?.close()
        infoWindows.remove(identifier)
    }
}
