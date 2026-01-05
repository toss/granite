package run.granite.navermap

import android.content.Context
import android.view.View

/**
 * Data class for map coordinates
 */
data class NaverMapCoordinate(
    val latitude: Double,
    val longitude: Double
)

/**
 * Data class for camera position
 */
data class NaverMapCameraPosition(
    val target: NaverMapCoordinate,
    val zoom: Double,
    val tilt: Double = 0.0,
    val bearing: Double = 0.0
)

/**
 * Data class for bounds
 */
data class NaverMapBounds(
    val southWest: NaverMapCoordinate,
    val northEast: NaverMapCoordinate
)

/**
 * Map type enum
 */
enum class NaverMapType {
    BASIC, NAVI, SATELLITE, HYBRID, TERRAIN, NONE
}

/**
 * Location tracking mode enum
 */
enum class NaverMapLocationTrackingMode {
    NONE, NO_FOLLOW, FOLLOW, FACE
}

/**
 * Marker data
 */
data class NaverMapMarkerData(
    val identifier: String,
    val coordinate: NaverMapCoordinate,
    val width: Int,
    val height: Int,
    val zIndex: Int,
    val rotation: Float,
    val flat: Boolean,
    val alpha: Float,
    val pinColor: Int,
    val image: String
)

/**
 * Polyline data
 */
data class NaverMapPolylineData(
    val identifier: String,
    val coordinates: List<NaverMapCoordinate>,
    val strokeWidth: Float,
    val strokeColor: Int,
    val zIndex: Int,
    val lineCap: Int,
    val lineJoin: Int,
    val pattern: List<Int>
)

/**
 * Polygon data
 */
data class NaverMapPolygonData(
    val identifier: String,
    val coordinates: List<NaverMapCoordinate>,
    val holes: List<List<NaverMapCoordinate>>,
    val fillColor: Int,
    val strokeColor: Int,
    val strokeWidth: Float,
    val zIndex: Int
)

/**
 * Circle data
 */
data class NaverMapCircleData(
    val identifier: String,
    val center: NaverMapCoordinate,
    val radius: Double,
    val fillColor: Int,
    val strokeColor: Int,
    val strokeWidth: Float,
    val zIndex: Int
)

/**
 * Path data
 */
data class NaverMapPathData(
    val identifier: String,
    val coordinates: List<NaverMapCoordinate>,
    val width: Float,
    val outlineWidth: Float,
    val color: Int,
    val outlineColor: Int,
    val passedColor: Int,
    val passedOutlineColor: Int,
    val patternImage: String,
    val patternInterval: Int,
    val progress: Float,
    val zIndex: Int
)

/**
 * Provider delegate interface for map events
 */
interface NaverMapProviderDelegate {
    fun onMapInitialized()
    fun onCameraChange(position: NaverMapCameraPosition, contentRegion: List<NaverMapCoordinate>, coveringRegion: List<NaverMapCoordinate>)
    fun onTouch(reason: Int, animated: Boolean)
    fun onClick(x: Double, y: Double, latitude: Double, longitude: Double)
    fun onMarkerClick(id: String)
}

/**
 * Pluggable Provider interface for NaverMap
 *
 * Brownfield apps can implement this interface to use their own map implementation.
 */
interface NaverMapProvider {
    /**
     * Create the map container view
     */
    fun createMapView(context: Context): View

    /**
     * Set the delegate for map events
     */
    fun setDelegate(delegate: NaverMapProviderDelegate?)

    /**
     * Called when the view is attached to window
     */
    fun onAttachedToWindow()

    /**
     * Called when the view is detached from window
     */
    fun onDetachedFromWindow()

    /**
     * Called when the view size changes
     */
    fun onSizeChanged(width: Int, height: Int)

    /**
     * Called on host resume
     */
    fun onHostResume()

    /**
     * Called on host pause
     */
    fun onHostPause()

    // MARK: - Camera

    fun moveCamera(position: NaverMapCameraPosition, animated: Boolean)
    fun animateToCoordinate(coordinate: NaverMapCoordinate)
    fun animateToBounds(bounds: NaverMapBounds, padding: Int)

    // MARK: - Map Properties

    fun setMapType(type: NaverMapType)
    fun setMapPadding(top: Int, left: Int, bottom: Int, right: Int)
    fun setCompassEnabled(enabled: Boolean)
    fun setScaleBarEnabled(enabled: Boolean)
    fun setZoomControlEnabled(enabled: Boolean)
    fun setLocationButtonEnabled(enabled: Boolean)
    fun setBuildingHeight(height: Float)
    fun setNightModeEnabled(enabled: Boolean)
    fun setMinZoomLevel(level: Double)
    fun setMaxZoomLevel(level: Double)
    fun setScrollGesturesEnabled(enabled: Boolean)
    fun setZoomGesturesEnabled(enabled: Boolean)
    fun setTiltGesturesEnabled(enabled: Boolean)
    fun setRotateGesturesEnabled(enabled: Boolean)
    fun setStopGesturesEnabled(enabled: Boolean)
    fun setLocationTrackingMode(mode: NaverMapLocationTrackingMode)
    fun setLayerGroupEnabled(group: String, enabled: Boolean)

    // MARK: - Markers

    fun addMarker(data: NaverMapMarkerData)
    fun updateMarker(data: NaverMapMarkerData)
    fun removeMarker(identifier: String)

    // MARK: - Polylines

    fun addPolyline(data: NaverMapPolylineData)
    fun updatePolyline(data: NaverMapPolylineData)
    fun removePolyline(identifier: String)

    // MARK: - Polygons

    fun addPolygon(data: NaverMapPolygonData)
    fun updatePolygon(data: NaverMapPolygonData)
    fun removePolygon(identifier: String)

    // MARK: - Circles

    fun addCircle(data: NaverMapCircleData)
    fun updateCircle(data: NaverMapCircleData)
    fun removeCircle(identifier: String)

    // MARK: - Paths

    fun addPath(data: NaverMapPathData)
    fun updatePath(data: NaverMapPathData)
    fun removePath(identifier: String)
}
