//
//  GraniteNaverMapViewImpl.swift
//  react-native-toss-naver-map
//
//  Fabric-compatible implementation of NaverMapView
//

import NMapsMap
import UIKit

@objc public protocol GraniteNaverMapViewDelegate: AnyObject {
    @objc func mapViewDidInitialize()
    @objc func mapViewDidChangeCamera(latitude: Double, longitude: Double, zoom: Double)
    @objc func mapViewDidTouch(reason: Int, animated: Bool)
    @objc func mapViewDidClick(x: Double, y: Double, latitude: Double, longitude: Double)
    @objc func mapViewDidClickMarker(id: String)
}

@objc public class GraniteNaverMapViewImpl: NMFNaverMapView {
    @objc public weak var eventDelegate: GraniteNaverMapViewDelegate?

    private var markers: [String: NMFMarker] = [:]
    private var polylines: [String: NMFPolylineOverlay] = [:]
    private var polygons: [String: NMFPolygonOverlay] = [:]
    private var circles: [String: NMFCircleOverlay] = [:]
    private var paths: [String: NMFPath] = [:]
    private var arrowheadPaths: [String: NMFArrowheadPath] = [:]
    private var groundOverlays: [String: NMFGroundOverlay] = [:]
    private var infoWindows: [String: NMFInfoWindow] = [:]
    private var isInitialized = false

    public override init(frame: CGRect) {
        super.init(frame: frame)
        setupMap()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupMap() {
        mapView.touchDelegate = self
        mapView.addCameraDelegate(delegate: self)
        mapView.addOptionDelegate(delegate: self)
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        if !isInitialized && bounds.width > 0 && bounds.height > 0 {
            isInitialized = true
            eventDelegate?.mapViewDidInitialize()
        }
    }

    // MARK: - Property Setters

    @objc public func setCenter(latitude: Double, longitude: Double, zoom: Double, tilt: Double, bearing: Double) {
        let position = NMFCameraPosition(
            NMGLatLng(lat: latitude, lng: longitude),
            zoom: zoom,
            tilt: tilt,
            heading: bearing
        )
        let update = NMFCameraUpdate(position: position)
        mapView.moveCamera(update)
    }

    @objc public func setMapType(_ type: Int) {
        guard let mapType = NMFMapType(rawValue: type) else { return }
        mapView.mapType = mapType
    }

    @objc public var mapPadding: UIEdgeInsets {
        get { mapView.contentInset }
        set { mapView.contentInset = newValue }
    }

    @objc public var compass: Bool {
        get { showCompass }
        set { showCompass = newValue }
    }

    @objc public var scaleBar: Bool {
        get { showScaleBar }
        set { showScaleBar = newValue }
    }

    @objc public var zoomControl: Bool {
        get { showZoomControls }
        set { showZoomControls = newValue }
    }

    @objc public var buildingHeight: Float {
        get { mapView.buildingHeight }
        set { mapView.buildingHeight = newValue }
    }

    @objc public var nightMode: Bool {
        get { mapView.isNightModeEnabled }
        set { mapView.isNightModeEnabled = newValue }
    }

    @objc public var minZoomLevel: Double {
        get { mapView.minZoomLevel }
        set { mapView.minZoomLevel = newValue }
    }

    @objc public var maxZoomLevel: Double {
        get { mapView.maxZoomLevel }
        set { mapView.maxZoomLevel = newValue }
    }

    @objc public var scrollGesturesEnabled: Bool {
        get { mapView.isScrollGestureEnabled }
        set { mapView.isScrollGestureEnabled = newValue }
    }

    @objc public var tiltGesturesEnabled: Bool {
        get { mapView.isTiltGestureEnabled }
        set { mapView.isTiltGestureEnabled = newValue }
    }

    @objc public var rotateGesturesEnabled: Bool {
        get { mapView.isRotateGestureEnabled }
        set { mapView.isRotateGestureEnabled = newValue }
    }

    @objc public var stopGesturesEnabled: Bool {
        get { mapView.isStopGestureEnabled }
        set { mapView.isStopGestureEnabled = newValue }
    }

    @objc public var locationTrackingMode: Int {
        get { Int(mapView.positionMode.rawValue) }
        set { mapView.positionMode = NMFMyPositionMode(rawValue: UInt(newValue)) ?? .disabled }
    }

    @objc public var showsMyLocationButton: Bool {
        get { showLocationButton }
        set { showLocationButton = newValue }
    }

    @objc public var zoomGesturesEnabled: Bool {
        get { mapView.isZoomGestureEnabled }
        set { mapView.isZoomGestureEnabled = newValue }
    }

    // MARK: - Commands

    @objc public func animateToCoordinate(latitude: Double, longitude: Double) {
        let cameraUpdate = NMFCameraUpdate(scrollTo: NMGLatLng(lat: latitude, lng: longitude))
        cameraUpdate.animation = .easeIn
        mapView.moveCamera(cameraUpdate)
    }

    @objc public func animateToTwoCoordinates(lat1: Double, lng1: Double, lat2: Double, lng2: Double) {
        let bounds = NMGLatLngBounds(
            southWestLat: min(lat1, lat2),
            southWestLng: min(lng1, lng2),
            northEastLat: max(lat1, lat2),
            northEastLng: max(lng1, lng2)
        )
        let cameraUpdate = NMFCameraUpdate(fit: bounds, padding: 24.0)
        cameraUpdate.animation = .easeIn
        mapView.moveCamera(cameraUpdate)
    }

    @objc public func animateToRegion(latitude: Double, longitude: Double, latitudeDelta: Double, longitudeDelta: Double) {
        let bounds = NMGLatLngBounds(
            southWestLat: latitude - latitudeDelta / 2,
            southWestLng: longitude - longitudeDelta / 2,
            northEastLat: latitude + latitudeDelta / 2,
            northEastLng: longitude + longitudeDelta / 2
        )
        let cameraUpdate = NMFCameraUpdate(fit: bounds, padding: 0.0)
        cameraUpdate.animation = .easeIn
        mapView.moveCamera(cameraUpdate)
    }

    @objc public func setLayerGroupEnabled(group: String, enabled: Bool) {
        let layerGroups: [String: String] = [
            "building": NMF_LAYER_GROUP_BUILDING,
            "ctt": NMF_LAYER_GROUP_TRAFFIC,
            "transit": NMF_LAYER_GROUP_TRANSIT,
            "bike": NMF_LAYER_GROUP_BICYCLE,
            "mountain": NMF_LAYER_GROUP_MOUNTAIN,
            "landparcel": NMF_LAYER_GROUP_CADASTRAL
        ]
        guard let layerGroup = layerGroups[group] else { return }
        mapView.setLayerGroup(layerGroup, isEnabled: enabled)
    }

    @objc public func addMarker(identifier: String, latitude: Double, longitude: Double, width: Int, height: Int, zIndex: Int, rotation: Float, flat: Bool, alpha: Float, pinColor: Int, image: String) {
        let marker = NMFMarker()
        marker.position = NMGLatLng(lat: latitude, lng: longitude)
        marker.width = CGFloat(width)
        marker.height = CGFloat(height)
        marker.zIndex = zIndex
        marker.angle = CGFloat(rotation)
        marker.isFlat = flat
        marker.alpha = CGFloat(alpha)

        marker.mapView = mapView
        markers[identifier] = marker

        marker.touchHandler = { [weak self] _ -> Bool in
            self?.eventDelegate?.mapViewDidClickMarker(id: identifier)
            return true
        }

        // Load image asynchronously if URL, otherwise use local image
        if !image.isEmpty {
            loadMarkerImage(marker: marker, image: image)
        }
    }

    @objc public func updateMarker(identifier: String, latitude: Double, longitude: Double, width: Int, height: Int, zIndex: Int, rotation: Float, flat: Bool, alpha: Float, pinColor: Int, image: String) {
        guard let marker = markers[identifier] else { return }

        marker.position = NMGLatLng(lat: latitude, lng: longitude)
        marker.width = CGFloat(width)
        marker.height = CGFloat(height)
        marker.zIndex = zIndex
        marker.angle = CGFloat(rotation)
        marker.isFlat = flat
        marker.alpha = CGFloat(alpha)

        // Load image asynchronously if URL, otherwise use local image
        if !image.isEmpty {
            loadMarkerImage(marker: marker, image: image)
        }
    }

    private func loadMarkerImage(marker: NMFMarker, image: String) {
        if image.hasPrefix("http://") || image.hasPrefix("https://") {
            guard let url = URL(string: image) else { return }
            Task {
                guard let (data, _) = try? await URLSession.shared.data(from: url),
                      let uiImage = UIImage(data: data) else { return }
                await MainActor.run {
                    marker.iconImage = NMFOverlayImage(image: uiImage)
                }
            }
        } else {
            marker.iconImage = NMFOverlayImage(name: image)
        }
    }

    @objc public func removeMarker(identifier: String) {
        guard let marker = markers[identifier] else { return }
        marker.mapView = nil
        markers[identifier] = nil
    }

    // MARK: - Polyline Commands

    private func parseCoordinates(_ json: String) -> [NMGLatLng] {
        guard let data = json.data(using: .utf8),
              let coords = try? JSONSerialization.jsonObject(with: data) as? [[String: Double]] else {
            return []
        }
        return coords.compactMap { coord in
            guard let lat = coord["latitude"], let lng = coord["longitude"] else { return nil }
            return NMGLatLng(lat: lat, lng: lng)
        }
    }

    private func parsePattern(_ json: String) -> [NSNumber] {
        guard let data = json.data(using: .utf8),
              let pattern = try? JSONSerialization.jsonObject(with: data) as? [Int] else {
            return []
        }
        return pattern.map { NSNumber(value: $0) }
    }

    private func lineCapType(_ value: Int) -> NMFOverlayLineCap {
        switch value {
        case 1: return .round
        case 2: return .square
        default: return .butt
        }
    }

    private func lineJoinType(_ value: Int) -> NMFOverlayLineJoin {
        switch value {
        case 1: return .miter
        case 2: return .round
        default: return .bevel
        }
    }

    private func colorFromInt(_ value: Int) -> UIColor {
        // Handle signed int from JS bridge by converting to unsigned
        let uValue = UInt32(bitPattern: Int32(truncatingIfNeeded: value))
        let alpha = CGFloat((uValue >> 24) & 0xFF) / 255.0
        let red = CGFloat((uValue >> 16) & 0xFF) / 255.0
        let green = CGFloat((uValue >> 8) & 0xFF) / 255.0
        let blue = CGFloat(uValue & 0xFF) / 255.0
        return UIColor(red: red, green: green, blue: blue, alpha: alpha)
    }

    @objc public func addPolyline(identifier: String, coordsJson: String, strokeWidth: Float, strokeColor: Int, zIndex: Int, lineCap: Int, lineJoin: Int, patternJson: String) {
        let coords = parseCoordinates(coordsJson)
        guard coords.count >= 2 else { return }

        let polyline = NMFPolylineOverlay(NMGLineString(points: coords))
        polyline?.width = CGFloat(strokeWidth)
        polyline?.color = colorFromInt(strokeColor)
        polyline?.zIndex = zIndex
        polyline?.capType = lineCapType(lineCap)
        polyline?.joinType = lineJoinType(lineJoin)

        let pattern = parsePattern(patternJson)
        if !pattern.isEmpty {
            polyline?.pattern = pattern
        }

        polyline?.mapView = mapView
        if let polyline = polyline {
            polylines[identifier] = polyline
        }
    }

    @objc public func updatePolyline(identifier: String, coordsJson: String, strokeWidth: Float, strokeColor: Int, zIndex: Int, lineCap: Int, lineJoin: Int, patternJson: String) {
        guard let polyline = polylines[identifier] else { return }

        let coords = parseCoordinates(coordsJson)
        if coords.count >= 2 {
            polyline.line = NMGLineString(points: coords)
        }
        polyline.width = CGFloat(strokeWidth)
        polyline.color = colorFromInt(strokeColor)
        polyline.zIndex = zIndex
        polyline.capType = lineCapType(lineCap)
        polyline.joinType = lineJoinType(lineJoin)

        let pattern = parsePattern(patternJson)
        if !pattern.isEmpty {
            polyline.pattern = pattern
        }
    }

    @objc public func removePolyline(identifier: String) {
        guard let polyline = polylines[identifier] else { return }
        polyline.mapView = nil
        polylines[identifier] = nil
    }

    // MARK: - Polygon Commands

    private func parseHoles(_ json: String) -> [[NMGLatLng]] {
        guard let data = json.data(using: .utf8),
              let holes = try? JSONSerialization.jsonObject(with: data) as? [[[String: Double]]] else {
            return []
        }
        return holes.map { hole in
            hole.compactMap { coord in
                guard let lat = coord["latitude"], let lng = coord["longitude"] else { return nil }
                return NMGLatLng(lat: lat, lng: lng)
            }
        }
    }

    @objc public func addPolygon(identifier: String, coordsJson: String, holesJson: String, fillColor: Int, strokeColor: Int, strokeWidth: Float, zIndex: Int) {
        let coords = parseCoordinates(coordsJson)
        guard coords.count >= 3 else { return }

        let exteriorRing = NMGLineString(points: coords)
        let holesData = parseHoles(holesJson)

        let nmgPolygon: NMGPolygon<AnyObject>
        if holesData.isEmpty {
            nmgPolygon = unsafeBitCast(NMGPolygon(ring: exteriorRing), to: NMGPolygon<AnyObject>.self)
        } else {
            let interiorRings = holesData.map { NMGLineString(points: $0) }
            nmgPolygon = unsafeBitCast(NMGPolygon(ring: exteriorRing, interiorRings: interiorRings), to: NMGPolygon<AnyObject>.self)
        }

        let polygon = NMFPolygonOverlay(nmgPolygon)
        polygon?.fillColor = colorFromInt(fillColor)
        polygon?.outlineColor = colorFromInt(strokeColor)
        polygon?.outlineWidth = UInt(strokeWidth)
        polygon?.zIndex = zIndex
        polygon?.mapView = mapView
        if let polygon = polygon {
            polygons[identifier] = polygon
        }
    }

    @objc public func updatePolygon(identifier: String, coordsJson: String, holesJson: String, fillColor: Int, strokeColor: Int, strokeWidth: Float, zIndex: Int) {
        guard let polygon = polygons[identifier] else { return }

        let coords = parseCoordinates(coordsJson)
        if coords.count >= 3 {
            let exteriorRing = NMGLineString(points: coords)
            let holesData = parseHoles(holesJson)

            if holesData.isEmpty {
                let nmgPolygon = NMGPolygon(ring: exteriorRing)
                polygon.polygon = unsafeBitCast(nmgPolygon, to: NMGPolygon<AnyObject>.self)
            } else {
                let interiorRings = holesData.map { NMGLineString(points: $0) }
                let nmgPolygon = NMGPolygon(ring: exteriorRing, interiorRings: interiorRings)
                polygon.polygon = unsafeBitCast(nmgPolygon, to: NMGPolygon<AnyObject>.self)
            }
        }

        polygon.fillColor = colorFromInt(fillColor)
        polygon.outlineColor = colorFromInt(strokeColor)
        polygon.outlineWidth = UInt(strokeWidth)
        polygon.zIndex = zIndex
    }

    @objc public func removePolygon(identifier: String) {
        guard let polygon = polygons[identifier] else { return }
        polygon.mapView = nil
        polygons[identifier] = nil
    }

    // MARK: - Circle Commands

    @objc public func addCircle(identifier: String, latitude: Double, longitude: Double, radius: Double, fillColor: Int, strokeColor: Int, strokeWidth: Float, zIndex: Int) {
        let circle = NMFCircleOverlay(NMGLatLng(lat: latitude, lng: longitude), radius: radius)
        circle.fillColor = colorFromInt(fillColor)
        circle.outlineColor = colorFromInt(strokeColor)
        circle.outlineWidth = Double(strokeWidth)
        circle.zIndex = zIndex
        circle.mapView = mapView
        circles[identifier] = circle
    }

    @objc public func updateCircle(identifier: String, latitude: Double, longitude: Double, radius: Double, fillColor: Int, strokeColor: Int, strokeWidth: Float, zIndex: Int) {
        guard let circle = circles[identifier] else { return }

        circle.center = NMGLatLng(lat: latitude, lng: longitude)
        circle.radius = radius
        circle.fillColor = colorFromInt(fillColor)
        circle.outlineColor = colorFromInt(strokeColor)
        circle.outlineWidth = Double(strokeWidth)
        circle.zIndex = zIndex
    }

    @objc public func removeCircle(identifier: String) {
        guard let circle = circles[identifier] else { return }
        circle.mapView = nil
        circles[identifier] = nil
    }

    // MARK: - Path Commands

    @objc public func addPath(identifier: String, coordsJson: String, width: Float, outlineWidth: Float, color: Int, outlineColor: Int, passedColor: Int, passedOutlineColor: Int, patternImage: String, patternInterval: Int, progress: Float, zIndex: Int) {
        let coords = parseCoordinates(coordsJson)
        guard coords.count >= 2 else { return }

        let path = NMFPath(points: coords)
        path?.width = CGFloat(width)
        path?.outlineWidth = CGFloat(outlineWidth)
        path?.color = colorFromInt(color)
        path?.outlineColor = colorFromInt(outlineColor)
        path?.passedColor = colorFromInt(passedColor)
        path?.passedOutlineColor = colorFromInt(passedOutlineColor)
        path?.progress = Double(progress)
        path?.zIndex = zIndex

        if !patternImage.isEmpty {
            path?.patternIcon = NMFOverlayImage(name: patternImage)
            path?.patternInterval = UInt(patternInterval)
        }

        path?.mapView = mapView
        if let path = path {
            paths[identifier] = path
        }
    }

    @objc public func updatePath(identifier: String, coordsJson: String, width: Float, outlineWidth: Float, color: Int, outlineColor: Int, passedColor: Int, passedOutlineColor: Int, patternImage: String, patternInterval: Int, progress: Float, zIndex: Int) {
        guard let path = paths[identifier] else { return }

        let coords = parseCoordinates(coordsJson)
        if coords.count >= 2 {
            path.path = NMGLineString(points: coords)
        }
        path.width = CGFloat(width)
        path.outlineWidth = CGFloat(outlineWidth)
        path.color = colorFromInt(color)
        path.outlineColor = colorFromInt(outlineColor)
        path.passedColor = colorFromInt(passedColor)
        path.passedOutlineColor = colorFromInt(passedOutlineColor)
        path.progress = Double(progress)
        path.zIndex = zIndex

        if !patternImage.isEmpty {
            path.patternIcon = NMFOverlayImage(name: patternImage)
            path.patternInterval = UInt(patternInterval)
        }
    }

    @objc public func removePath(identifier: String) {
        guard let path = paths[identifier] else { return }
        path.mapView = nil
        paths[identifier] = nil
    }

    // MARK: - ArrowheadPath Commands

    @objc public func addArrowheadPath(identifier: String, coordsJson: String, width: Float, outlineWidth: Float, color: Int, outlineColor: Int, headSizeRatio: Float, zIndex: Int) {
        let coords = parseCoordinates(coordsJson)
        guard coords.count >= 2 else { return }

        let arrowheadPath = NMFArrowheadPath(coords)
        arrowheadPath?.width = CGFloat(width)
        arrowheadPath?.outlineWidth = CGFloat(outlineWidth)
        arrowheadPath?.color = colorFromInt(color)
        arrowheadPath?.outlineColor = colorFromInt(outlineColor)
        arrowheadPath?.headSizeRatio = CGFloat(headSizeRatio)
        arrowheadPath?.zIndex = zIndex

        arrowheadPath?.mapView = mapView
        if let arrowheadPath = arrowheadPath {
            arrowheadPaths[identifier] = arrowheadPath
        }
    }

    @objc public func updateArrowheadPath(identifier: String, coordsJson: String, width: Float, outlineWidth: Float, color: Int, outlineColor: Int, headSizeRatio: Float, zIndex: Int) {
        guard let arrowheadPath = arrowheadPaths[identifier] else { return }

        let coords = parseCoordinates(coordsJson)
        if coords.count >= 2 {
            arrowheadPath.points = coords
        }
        arrowheadPath.width = CGFloat(width)
        arrowheadPath.outlineWidth = CGFloat(outlineWidth)
        arrowheadPath.color = colorFromInt(color)
        arrowheadPath.outlineColor = colorFromInt(outlineColor)
        arrowheadPath.headSizeRatio = CGFloat(headSizeRatio)
        arrowheadPath.zIndex = zIndex
    }

    @objc public func removeArrowheadPath(identifier: String) {
        guard let arrowheadPath = arrowheadPaths[identifier] else { return }
        arrowheadPath.mapView = nil
        arrowheadPaths[identifier] = nil
    }

    // MARK: - GroundOverlay Commands

    private func overlayImage(from image: String) -> NMFOverlayImage? {
        if image.hasPrefix("http://") || image.hasPrefix("https://") {
            // URL 기반 이미지는 비동기 로딩이 필요하므로 일단 nil 반환
            // 실제로는 이미지를 다운로드하여 UIImage로 변환해야 함
            guard let url = URL(string: image),
                  let data = try? Data(contentsOf: url),
                  let uiImage = UIImage(data: data) else {
                return nil
            }
            return NMFOverlayImage(image: uiImage)
        }
        return NMFOverlayImage(name: image)
    }

    @objc public func addGroundOverlay(identifier: String, southWestLat: Double, southWestLng: Double, northEastLat: Double, northEastLng: Double, image: String, alpha: Float, zIndex: Int) {
        guard let overlayImg = overlayImage(from: image) else { return }

        let bounds = NMGLatLngBounds(
            southWest: NMGLatLng(lat: southWestLat, lng: southWestLng),
            northEast: NMGLatLng(lat: northEastLat, lng: northEastLng)
        )
        let groundOverlay = NMFGroundOverlay(bounds: bounds, image: overlayImg)
        groundOverlay.alpha = CGFloat(alpha)
        groundOverlay.zIndex = zIndex
        groundOverlay.mapView = mapView
        groundOverlays[identifier] = groundOverlay
    }

    @objc public func updateGroundOverlay(identifier: String, southWestLat: Double, southWestLng: Double, northEastLat: Double, northEastLng: Double, image: String, alpha: Float, zIndex: Int) {
        guard let groundOverlay = groundOverlays[identifier] else { return }
        guard let overlayImg = overlayImage(from: image) else { return }

        groundOverlay.bounds = NMGLatLngBounds(
            southWest: NMGLatLng(lat: southWestLat, lng: southWestLng),
            northEast: NMGLatLng(lat: northEastLat, lng: northEastLng)
        )
        groundOverlay.overlayImage = overlayImg
        groundOverlay.alpha = CGFloat(alpha)
        groundOverlay.zIndex = zIndex
    }

    @objc public func removeGroundOverlay(identifier: String) {
        guard let groundOverlay = groundOverlays[identifier] else { return }
        groundOverlay.mapView = nil
        groundOverlays[identifier] = nil
    }

    // MARK: - InfoWindow Commands

    @objc public func addInfoWindow(identifier: String, latitude: Double, longitude: Double, text: String, alpha: Float, zIndex: Int, offsetX: Int, offsetY: Int) {
        let infoWindow = NMFInfoWindow()
        let dataSource = NMFInfoWindowDefaultTextSource.data()
        dataSource.title = text
        infoWindow.dataSource = dataSource
        infoWindow.position = NMGLatLng(lat: latitude, lng: longitude)
        infoWindow.alpha = CGFloat(alpha)
        infoWindow.zIndex = zIndex
        infoWindow.offsetX = offsetX
        infoWindow.offsetY = offsetY
        infoWindow.open(with: mapView)
        infoWindows[identifier] = infoWindow
    }

    @objc public func updateInfoWindow(identifier: String, latitude: Double, longitude: Double, text: String, alpha: Float, zIndex: Int, offsetX: Int, offsetY: Int) {
        guard let infoWindow = infoWindows[identifier] else { return }

        let dataSource = NMFInfoWindowDefaultTextSource.data()
        dataSource.title = text
        infoWindow.dataSource = dataSource
        infoWindow.position = NMGLatLng(lat: latitude, lng: longitude)
        infoWindow.alpha = CGFloat(alpha)
        infoWindow.zIndex = zIndex
        infoWindow.offsetX = offsetX
        infoWindow.offsetY = offsetY
    }

    @objc public func removeInfoWindow(identifier: String) {
        guard let infoWindow = infoWindows[identifier] else { return }
        infoWindow.close()
        infoWindows[identifier] = nil
    }
}

// MARK: - NMFMapViewTouchDelegate

extension GraniteNaverMapViewImpl: NMFMapViewTouchDelegate {
    public func mapView(_ mapView: NMFMapView, didTapMap latlng: NMGLatLng, point: CGPoint) {
        eventDelegate?.mapViewDidClick(x: point.x, y: point.y, latitude: latlng.lat, longitude: latlng.lng)
    }
}

// MARK: - NMFMapViewCameraDelegate

extension GraniteNaverMapViewImpl: NMFMapViewCameraDelegate {
    public func mapView(_ mapView: NMFMapView, cameraWillChangeByReason reason: Int, animated: Bool) {
        eventDelegate?.mapViewDidTouch(reason: reason, animated: animated)
    }

    public func mapViewCameraIdle(_ mapView: NMFMapView) {
        eventDelegate?.mapViewDidChangeCamera(
            latitude: mapView.cameraPosition.target.lat,
            longitude: mapView.cameraPosition.target.lng,
            zoom: mapView.cameraPosition.zoom
        )
    }
}

// MARK: - NMFMapViewOptionDelegate

extension GraniteNaverMapViewImpl: NMFMapViewOptionDelegate {
    public func mapViewOptionChanged(_ mapView: NMFMapView) {
        // Handle option changes if needed
    }
}
