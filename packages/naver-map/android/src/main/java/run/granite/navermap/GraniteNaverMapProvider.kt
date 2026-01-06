package run.granite.navermap

import android.content.Context
import android.view.View

/**
 * Data class for map coordinates
 */
data class GraniteNaverMapCoordinate(
    val latitude: Double,
    val longitude: Double
)

/**
 * Data class for camera position
 */
data class GraniteNaverMapCameraPosition(
    val target: GraniteNaverMapCoordinate,
    val zoom: Double,
    val tilt: Double = 0.0,
    val bearing: Double = 0.0
)

/**
 * Data class for bounds
 */
data class GraniteNaverMapBounds(
    val southWest: GraniteNaverMapCoordinate,
    val northEast: GraniteNaverMapCoordinate
)

/**
 * Map type enum
 */
enum class GraniteNaverMapType {
    BASIC, NAVI, SATELLITE, HYBRID, TERRAIN, NONE
}

/**
 * Location tracking mode enum
 */
enum class GraniteNaverMapLocationTrackingMode {
    NONE, NO_FOLLOW, FOLLOW, FACE
}

/**
 * Marker data
 */
data class GraniteNaverMapMarkerData(
    val identifier: String,
    val coordinate: GraniteNaverMapCoordinate,
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
data class GraniteNaverMapPolylineData(
    val identifier: String,
    val coordinates: List<GraniteNaverMapCoordinate>,
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
data class GraniteNaverMapPolygonData(
    val identifier: String,
    val coordinates: List<GraniteNaverMapCoordinate>,
    val holes: List<List<GraniteNaverMapCoordinate>>,
    val fillColor: Int,
    val strokeColor: Int,
    val strokeWidth: Float,
    val zIndex: Int
)

/**
 * Circle data
 */
data class GraniteNaverMapCircleData(
    val identifier: String,
    val center: GraniteNaverMapCoordinate,
    val radius: Double,
    val fillColor: Int,
    val strokeColor: Int,
    val strokeWidth: Float,
    val zIndex: Int
)

/**
 * Path data
 */
data class GraniteNaverMapPathData(
    val identifier: String,
    val coordinates: List<GraniteNaverMapCoordinate>,
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
interface GraniteNaverMapProviderDelegate {
    fun onMapInitialized()
    fun onCameraChange(position: GraniteNaverMapCameraPosition, contentRegion: List<GraniteNaverMapCoordinate>, coveringRegion: List<GraniteNaverMapCoordinate>)
    fun onTouch(reason: Int, animated: Boolean)
    fun onClick(x: Double, y: Double, latitude: Double, longitude: Double)
    fun onMarkerClick(id: String)
}

/**
 * Pluggable Provider interface for NaverMap
 *
 * Brownfield apps can implement this interface to use their own map implementation.
 */
interface GraniteNaverMapProvider {
    /**
     * Create the map container view
     */
    fun createMapView(context: Context): View

    /**
     * Set the delegate for map events
     */
    fun setDelegate(delegate: GraniteNaverMapProviderDelegate?)

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

    fun moveCamera(position: GraniteNaverMapCameraPosition, animated: Boolean)
    fun animateToCoordinate(coordinate: GraniteNaverMapCoordinate)
    fun animateToBounds(bounds: GraniteNaverMapBounds, padding: Int)

    // MARK: - Map Properties

    fun setMapType(type: GraniteNaverMapType)
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
    fun setLocationTrackingMode(mode: GraniteNaverMapLocationTrackingMode)
    fun setLayerGroupEnabled(group: String, enabled: Boolean)

    // MARK: - Markers

    fun addMarker(data: GraniteNaverMapMarkerData)
    fun updateMarker(data: GraniteNaverMapMarkerData)
    fun removeMarker(identifier: String)

    // MARK: - Polylines

    fun addPolyline(data: GraniteNaverMapPolylineData)
    fun updatePolyline(data: GraniteNaverMapPolylineData)
    fun removePolyline(identifier: String)

    // MARK: - Polygons

    fun addPolygon(data: GraniteNaverMapPolygonData)
    fun updatePolygon(data: GraniteNaverMapPolygonData)
    fun removePolygon(identifier: String)

    // MARK: - Circles

    fun addCircle(data: GraniteNaverMapCircleData)
    fun updateCircle(data: GraniteNaverMapCircleData)
    fun removeCircle(identifier: String)

    // MARK: - Paths

    fun addPath(data: GraniteNaverMapPathData)
    fun updatePath(data: GraniteNaverMapPathData)
    fun removePath(identifier: String)
}
