package run.granite.navermap.builtinProvider

import android.content.Context
import run.granite.navermap.GraniteNaverMapProvider
import run.granite.navermap.GraniteNaverMapProviderFactory
import run.granite.navermap.GraniteNaverMapProviderDelegate
import run.granite.navermap.GraniteNaverMapCameraPosition
import run.granite.navermap.GraniteNaverMapCoordinate
import run.granite.navermap.GraniteNaverMapBounds
import run.granite.navermap.GraniteNaverMapType
import run.granite.navermap.GraniteNaverMapLocationTrackingMode
import run.granite.navermap.GraniteNaverMapMarkerData
import run.granite.navermap.GraniteNaverMapPolylineData
import run.granite.navermap.GraniteNaverMapPolygonData
import run.granite.navermap.GraniteNaverMapCircleData
import run.granite.navermap.GraniteNaverMapPathData
import android.graphics.BitmapFactory
import android.view.View
import android.widget.FrameLayout
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
import java.net.URL
import kotlin.concurrent.thread

/**
 * Factory for creating BuiltInGraniteNaverMapProvider instances.
 * Each call to createProvider() returns a new instance.
 */
class BuiltInGraniteNaverMapProviderFactory : GraniteNaverMapProviderFactory {
    override fun createProvider(context: Context): GraniteNaverMapProvider {
        return BuiltInGraniteNaverMapProvider(context)
    }
}

/**
 * Built-in provider using NMapsMap SDK
 */
class BuiltInGraniteNaverMapProvider(private val context: Context) : GraniteNaverMapProvider {
    private var containerView: FrameLayout? = null
    private var mapView: MapView? = null
    private var naverMap: NaverMap? = null
    private var delegate: GraniteNaverMapProviderDelegate? = null
    private var mapReady = false
    private var mapInitialized = false

    private val density = context.resources.displayMetrics.density

    private val markers: MutableMap<String, Marker> = mutableMapOf()
    private val polylines: MutableMap<String, PolylineOverlay> = mutableMapOf()
    private val polygons: MutableMap<String, PolygonOverlay> = mutableMapOf()
    private val circles: MutableMap<String, CircleOverlay> = mutableMapOf()
    private val paths: MutableMap<String, PathOverlay> = mutableMapOf()

    private fun dpToPx(dp: Int): Int = (dp * density).toInt()
    private fun dpToPx(dp: Float): Int = (dp * density).toInt()

    override fun createMapView(context: Context): View {
        val container = FrameLayout(context)
        containerView = container

        val map = MapView(context, NaverMapOptions())
        mapView = map
        container.addView(map, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        return container
    }

    override fun setDelegate(delegate: GraniteNaverMapProviderDelegate?) {
        this.delegate = delegate
    }

    override fun onAttachedToWindow() {
        // Lifecycle is handled in onSizeChanged
    }

    override fun onDetachedFromWindow() {
        mapView?.onPause()
        mapView?.onStop()
        mapView?.onDestroy()
    }

    override fun onSizeChanged(width: Int, height: Int) {
        if (!mapInitialized && width > 0 && height > 0) {
            mapInitialized = true
            initializeMap()
        }
    }

    override fun onHostResume() {
        if (mapReady) {
            mapView?.onResume()
        }
    }

    override fun onHostPause() {
        if (mapReady) {
            mapView?.onPause()
        }
    }

    private fun initializeMap() {
        mapView?.onCreate(null)
        mapView?.onStart()
        mapView?.onResume()

        mapView?.getMapAsync { map ->
            naverMap = map
            mapReady = true
            setupMapListeners(map)
            delegate?.onMapInitialized()
        }
    }

    private fun setupMapListeners(map: NaverMap) {
        map.addOnCameraIdleListener {
            val position = map.cameraPosition
            val contentBounds = map.contentBounds
            val coveringBounds = map.coveringBounds

            val cameraPos = GraniteNaverMapCameraPosition(
                target = GraniteNaverMapCoordinate(position.target.latitude, position.target.longitude),
                zoom = position.zoom,
                tilt = position.tilt,
                bearing = position.bearing
            )

            val contentRegion = listOf(
                GraniteNaverMapCoordinate(contentBounds.southLatitude, contentBounds.westLongitude),
                GraniteNaverMapCoordinate(contentBounds.southLatitude, contentBounds.eastLongitude),
                GraniteNaverMapCoordinate(contentBounds.northLatitude, contentBounds.eastLongitude),
                GraniteNaverMapCoordinate(contentBounds.northLatitude, contentBounds.westLongitude)
            )

            val coveringRegion = listOf(
                GraniteNaverMapCoordinate(coveringBounds.southLatitude, coveringBounds.westLongitude),
                GraniteNaverMapCoordinate(coveringBounds.southLatitude, coveringBounds.eastLongitude),
                GraniteNaverMapCoordinate(coveringBounds.northLatitude, coveringBounds.eastLongitude),
                GraniteNaverMapCoordinate(coveringBounds.northLatitude, coveringBounds.westLongitude)
            )

            delegate?.onCameraChange(cameraPos, contentRegion, coveringRegion)
        }

        map.addOnCameraChangeListener { reason, animated ->
            delegate?.onTouch(reason, animated)
        }

        map.setOnMapClickListener { point, latLng ->
            delegate?.onClick(point.x.toDouble(), point.y.toDouble(), latLng.latitude, latLng.longitude)
        }
    }

    // MARK: - Camera

    override fun moveCamera(position: GraniteNaverMapCameraPosition, animated: Boolean) {
        val cameraPosition = CameraPosition(
            LatLng(position.target.latitude, position.target.longitude),
            position.zoom,
            position.tilt,
            position.bearing
        )
        val update = CameraUpdate.toCameraPosition(cameraPosition)
        if (animated) {
            update.animate(CameraAnimation.Easing)
        }
        naverMap?.moveCamera(update)
    }

    override fun animateToCoordinate(coordinate: GraniteNaverMapCoordinate) {
        naverMap?.moveCamera(
            CameraUpdate.scrollTo(LatLng(coordinate.latitude, coordinate.longitude))
                .animate(CameraAnimation.Easing)
        )
    }

    override fun animateToBounds(bounds: GraniteNaverMapBounds, padding: Int) {
        val latLngBounds = LatLngBounds(
            LatLng(bounds.southWest.latitude, bounds.southWest.longitude),
            LatLng(bounds.northEast.latitude, bounds.northEast.longitude)
        )
        naverMap?.moveCamera(
            CameraUpdate.fitBounds(latLngBounds, padding)
                .animate(CameraAnimation.Easing)
        )
    }

    // MARK: - Map Properties

    override fun setMapType(type: GraniteNaverMapType) {
        naverMap?.mapType = when (type) {
            GraniteNaverMapType.BASIC -> NaverMap.MapType.Basic
            GraniteNaverMapType.NAVI -> NaverMap.MapType.Navi
            GraniteNaverMapType.SATELLITE -> NaverMap.MapType.Satellite
            GraniteNaverMapType.HYBRID -> NaverMap.MapType.Hybrid
            GraniteNaverMapType.TERRAIN -> NaverMap.MapType.Terrain
            GraniteNaverMapType.NONE -> NaverMap.MapType.None
        }
    }

    override fun setMapPadding(top: Int, left: Int, bottom: Int, right: Int) {
        naverMap?.setContentPadding(left, top, right, bottom)
    }

    override fun setCompassEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isCompassEnabled = enabled
    }

    override fun setScaleBarEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isScaleBarEnabled = enabled
    }

    override fun setZoomControlEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isZoomControlEnabled = enabled
    }

    override fun setLocationButtonEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isLocationButtonEnabled = enabled
    }

    override fun setBuildingHeight(height: Float) {
        naverMap?.buildingHeight = height
    }

    override fun setNightModeEnabled(enabled: Boolean) {
        naverMap?.isNightModeEnabled = enabled
    }

    override fun setMinZoomLevel(level: Double) {
        naverMap?.minZoom = level
    }

    override fun setMaxZoomLevel(level: Double) {
        naverMap?.maxZoom = level
    }

    override fun setScrollGesturesEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isScrollGesturesEnabled = enabled
    }

    override fun setZoomGesturesEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isZoomGesturesEnabled = enabled
    }

    override fun setTiltGesturesEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isTiltGesturesEnabled = enabled
    }

    override fun setRotateGesturesEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isRotateGesturesEnabled = enabled
    }

    override fun setStopGesturesEnabled(enabled: Boolean) {
        naverMap?.uiSettings?.isStopGesturesEnabled = enabled
    }

    override fun setLocationTrackingMode(mode: GraniteNaverMapLocationTrackingMode) {
        naverMap?.locationTrackingMode = when (mode) {
            GraniteNaverMapLocationTrackingMode.NONE -> LocationTrackingMode.None
            GraniteNaverMapLocationTrackingMode.NO_FOLLOW -> LocationTrackingMode.NoFollow
            GraniteNaverMapLocationTrackingMode.FOLLOW -> LocationTrackingMode.Follow
            GraniteNaverMapLocationTrackingMode.FACE -> LocationTrackingMode.Face
        }
    }

    override fun setLayerGroupEnabled(group: String, enabled: Boolean) {
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

    // MARK: - Markers

    override fun addMarker(data: GraniteNaverMapMarkerData) {
        val map = naverMap ?: return

        val marker = Marker().apply {
            position = LatLng(data.coordinate.latitude, data.coordinate.longitude)
            if (data.zIndex != 0) zIndex = data.zIndex
            if (data.rotation != 0f) angle = data.rotation
            isFlat = data.flat
            alpha = data.alpha

            if (data.pinColor != 0 && (data.pinColor ushr 24) != 0) {
                iconTintColor = data.pinColor
            }

            if (data.image.isNotEmpty()) {
                loadMarkerImage(this, data.image)
                if (data.width > 0) width = dpToPx(data.width)
                if (data.height > 0) height = dpToPx(data.height)
            }

            setOnClickListener {
                delegate?.onMarkerClick(data.identifier)
                true
            }

            this.map = map
        }

        markers[data.identifier] = marker
    }

    override fun updateMarker(data: GraniteNaverMapMarkerData) {
        markers[data.identifier]?.apply {
            position = LatLng(data.coordinate.latitude, data.coordinate.longitude)
            if (data.width > 0) width = dpToPx(data.width)
            if (data.height > 0) height = dpToPx(data.height)
            zIndex = data.zIndex
            angle = data.rotation
            isFlat = data.flat
            alpha = data.alpha
            if (data.pinColor != 0) iconTintColor = data.pinColor
            if (data.image.isNotEmpty()) loadMarkerImage(this, data.image)
        }
    }

    override fun removeMarker(identifier: String) {
        markers[identifier]?.map = null
        markers.remove(identifier)
    }

    private fun loadMarkerImage(marker: Marker, url: String) {
        thread {
            try {
                val connection = URL(url).openConnection()
                connection.connect()
                val inputStream = connection.getInputStream()
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()

                containerView?.post {
                    marker.icon = OverlayImage.fromBitmap(bitmap)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // MARK: - Polylines

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

    override fun addPolyline(data: GraniteNaverMapPolylineData) {
        val map = naverMap ?: return
        val coords = data.coordinates.map { LatLng(it.latitude, it.longitude) }
        if (coords.size < 2) return

        val polyline = PolylineOverlay().apply {
            this.coords = coords
            width = dpToPx(data.strokeWidth)
            color = data.strokeColor
            zIndex = data.zIndex
            capType = lineCapType(data.lineCap)
            joinType = lineJoinType(data.lineJoin)
            if (data.pattern.isNotEmpty()) {
                setPattern(*data.pattern.toIntArray())
            }
            this.map = map
        }

        polylines[data.identifier] = polyline
    }

    override fun updatePolyline(data: GraniteNaverMapPolylineData) {
        val polyline = polylines[data.identifier] ?: return
        val coords = data.coordinates.map { LatLng(it.latitude, it.longitude) }
        if (coords.size >= 2) {
            polyline.coords = coords
        }
        polyline.width = dpToPx(data.strokeWidth)
        polyline.color = data.strokeColor
        polyline.zIndex = data.zIndex
        polyline.capType = lineCapType(data.lineCap)
        polyline.joinType = lineJoinType(data.lineJoin)
        if (data.pattern.isNotEmpty()) {
            polyline.setPattern(*data.pattern.toIntArray())
        }
    }

    override fun removePolyline(identifier: String) {
        polylines[identifier]?.map = null
        polylines.remove(identifier)
    }

    // MARK: - Polygons

    override fun addPolygon(data: GraniteNaverMapPolygonData) {
        val map = naverMap ?: return
        val coords = data.coordinates.map { LatLng(it.latitude, it.longitude) }
        if (coords.size < 3) return

        val polygon = PolygonOverlay().apply {
            this.coords = coords
            if (data.holes.isNotEmpty()) {
                this.holes = data.holes.map { hole ->
                    hole.map { LatLng(it.latitude, it.longitude) }
                }
            }
            color = data.fillColor
            outlineColor = data.strokeColor
            outlineWidth = dpToPx(data.strokeWidth)
            zIndex = data.zIndex
            this.map = map
        }

        polygons[data.identifier] = polygon
    }

    override fun updatePolygon(data: GraniteNaverMapPolygonData) {
        val polygon = polygons[data.identifier] ?: return
        val coords = data.coordinates.map { LatLng(it.latitude, it.longitude) }
        if (coords.size >= 3) {
            polygon.coords = coords
        }
        if (data.holes.isNotEmpty()) {
            polygon.holes = data.holes.map { hole ->
                hole.map { LatLng(it.latitude, it.longitude) }
            }
        }
        polygon.color = data.fillColor
        polygon.outlineColor = data.strokeColor
        polygon.outlineWidth = dpToPx(data.strokeWidth)
        polygon.zIndex = data.zIndex
    }

    override fun removePolygon(identifier: String) {
        polygons[identifier]?.map = null
        polygons.remove(identifier)
    }

    // MARK: - Circles

    override fun addCircle(data: GraniteNaverMapCircleData) {
        val map = naverMap ?: return

        val circle = CircleOverlay().apply {
            center = LatLng(data.center.latitude, data.center.longitude)
            radius = data.radius
            color = data.fillColor
            outlineColor = data.strokeColor
            outlineWidth = dpToPx(data.strokeWidth)
            zIndex = data.zIndex
            this.map = map
        }

        circles[data.identifier] = circle
    }

    override fun updateCircle(data: GraniteNaverMapCircleData) {
        val circle = circles[data.identifier] ?: return
        circle.center = LatLng(data.center.latitude, data.center.longitude)
        circle.radius = data.radius
        circle.color = data.fillColor
        circle.outlineColor = data.strokeColor
        circle.outlineWidth = dpToPx(data.strokeWidth)
        circle.zIndex = data.zIndex
    }

    override fun removeCircle(identifier: String) {
        circles[identifier]?.map = null
        circles.remove(identifier)
    }

    // MARK: - Paths

    override fun addPath(data: GraniteNaverMapPathData) {
        val map = naverMap ?: return
        val coords = data.coordinates.map { LatLng(it.latitude, it.longitude) }
        if (coords.size < 2) return

        val path = PathOverlay().apply {
            this.coords = coords
            width = dpToPx(data.width)
            outlineWidth = dpToPx(data.outlineWidth)
            color = data.color
            outlineColor = data.outlineColor
            passedColor = data.passedColor
            passedOutlineColor = data.passedOutlineColor
            progress = data.progress.toDouble()
            zIndex = data.zIndex
            if (data.patternInterval > 0) {
                patternInterval = data.patternInterval
            }
            this.map = map
        }

        paths[data.identifier] = path
    }

    override fun updatePath(data: GraniteNaverMapPathData) {
        val path = paths[data.identifier] ?: return
        val coords = data.coordinates.map { LatLng(it.latitude, it.longitude) }
        if (coords.size >= 2) {
            path.coords = coords
        }
        path.width = dpToPx(data.width)
        path.outlineWidth = dpToPx(data.outlineWidth)
        path.color = data.color
        path.outlineColor = data.outlineColor
        path.passedColor = data.passedColor
        path.passedOutlineColor = data.passedOutlineColor
        path.progress = data.progress.toDouble()
        path.zIndex = data.zIndex
    }

    override fun removePath(identifier: String) {
        paths[identifier]?.map = null
        paths.remove(identifier)
    }
}
