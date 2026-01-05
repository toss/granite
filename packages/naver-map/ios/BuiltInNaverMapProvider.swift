//
//  BuiltInNaverMapProvider.swift
//  granite-naver-map
//
//  Built-in provider using NMapsMap SDK
//

import UIKit
import NMapsMap

@objc public class BuiltInNaverMapProvider: NSObject, NaverMapProvidable {
    private var mapView: NMFNaverMapView?
    private weak var delegate: NaverMapProviderDelegate?
    private var isInitialized = false

    private var markers: [String: NMFMarker] = [:]
    private var polylines: [String: NMFPolylineOverlay] = [:]
    private var polygons: [String: NMFPolygonOverlay] = [:]
    private var circles: [String: NMFCircleOverlay] = [:]
    private var paths: [String: NMFPath] = [:]

    // MARK: - NaverMapProvidable

    @objc public func createMapView(frame: CGRect) -> UIView {
        let view = NMFNaverMapView(frame: frame)
        self.mapView = view
        setupMap(view)
        return view
    }

    @objc public func setDelegate(_ delegate: NaverMapProviderDelegate?) {
        self.delegate = delegate
    }

    private func setupMap(_ view: NMFNaverMapView) {
        view.mapView.touchDelegate = self
        view.mapView.addCameraDelegate(delegate: self)
    }

    // MARK: - Camera

    @objc public func moveCamera(to position: NaverMapCameraPosition, animated: Bool) {
        guard let mapView = mapView else { return }
        let cameraPosition = NMFCameraPosition(
            NMGLatLng(lat: position.target.latitude, lng: position.target.longitude),
            zoom: position.zoom,
            tilt: position.tilt,
            heading: position.bearing
        )
        let update = NMFCameraUpdate(position: cameraPosition)
        if animated {
            update.animation = .easeIn
        }
        mapView.mapView.moveCamera(update)
    }

    @objc public func animateToCoordinate(_ coordinate: NaverMapCoordinate) {
        guard let mapView = mapView else { return }
        let cameraUpdate = NMFCameraUpdate(scrollTo: NMGLatLng(lat: coordinate.latitude, lng: coordinate.longitude))
        cameraUpdate.animation = .easeIn
        mapView.mapView.moveCamera(cameraUpdate)
    }

    @objc public func animateToBounds(_ bounds: NaverMapBounds, padding: CGFloat) {
        guard let mapView = mapView else { return }
        let nmgBounds = NMGLatLngBounds(
            southWest: NMGLatLng(lat: bounds.southWest.latitude, lng: bounds.southWest.longitude),
            northEast: NMGLatLng(lat: bounds.northEast.latitude, lng: bounds.northEast.longitude)
        )
        let cameraUpdate = NMFCameraUpdate(fit: nmgBounds, padding: padding)
        cameraUpdate.animation = .easeIn
        mapView.mapView.moveCamera(cameraUpdate)
    }

    // MARK: - Map Properties

    @objc public func setMapType(_ type: NaverMapType) {
        guard let mapView = mapView, let nmfType = NMFMapType(rawValue: type.rawValue) else { return }
        mapView.mapView.mapType = nmfType
    }

    @objc public func setMapPadding(_ padding: UIEdgeInsets) {
        mapView?.mapView.contentInset = padding
    }

    @objc public func setCompassEnabled(_ enabled: Bool) {
        mapView?.showCompass = enabled
    }

    @objc public func setScaleBarEnabled(_ enabled: Bool) {
        mapView?.showScaleBar = enabled
    }

    @objc public func setZoomControlEnabled(_ enabled: Bool) {
        mapView?.showZoomControls = enabled
    }

    @objc public func setLocationButtonEnabled(_ enabled: Bool) {
        mapView?.showLocationButton = enabled
    }

    @objc public func setBuildingHeight(_ height: Float) {
        mapView?.mapView.buildingHeight = height
    }

    @objc public func setNightModeEnabled(_ enabled: Bool) {
        mapView?.mapView.isNightModeEnabled = enabled
    }

    @objc public func setMinZoomLevel(_ level: Double) {
        mapView?.mapView.minZoomLevel = level
    }

    @objc public func setMaxZoomLevel(_ level: Double) {
        mapView?.mapView.maxZoomLevel = level
    }

    @objc public func setScrollGesturesEnabled(_ enabled: Bool) {
        mapView?.mapView.isScrollGestureEnabled = enabled
    }

    @objc public func setZoomGesturesEnabled(_ enabled: Bool) {
        mapView?.mapView.isZoomGestureEnabled = enabled
    }

    @objc public func setTiltGesturesEnabled(_ enabled: Bool) {
        mapView?.mapView.isTiltGestureEnabled = enabled
    }

    @objc public func setRotateGesturesEnabled(_ enabled: Bool) {
        mapView?.mapView.isRotateGestureEnabled = enabled
    }

    @objc public func setStopGesturesEnabled(_ enabled: Bool) {
        mapView?.mapView.isStopGestureEnabled = enabled
    }

    @objc public func setLocationTrackingMode(_ mode: NaverMapLocationTrackingMode) {
        guard let mapView = mapView else { return }
        mapView.mapView.positionMode = NMFMyPositionMode(rawValue: UInt(mode.rawValue)) ?? .disabled
    }

    @objc public func setLayerGroupEnabled(group: String, enabled: Bool) {
        guard let mapView = mapView else { return }
        let layerGroups: [String: String] = [
            "building": NMF_LAYER_GROUP_BUILDING,
            "ctt": NMF_LAYER_GROUP_TRAFFIC,
            "transit": NMF_LAYER_GROUP_TRANSIT,
            "bike": NMF_LAYER_GROUP_BICYCLE,
            "mountain": NMF_LAYER_GROUP_MOUNTAIN,
            "landparcel": NMF_LAYER_GROUP_CADASTRAL
        ]
        guard let layerGroup = layerGroups[group] else { return }
        mapView.mapView.setLayerGroup(layerGroup, isEnabled: enabled)
    }

    // MARK: - Markers

    @objc public func addMarker(_ data: ProviderMarkerData) {
        guard let mapView = mapView else { return }

        let marker = NMFMarker()
        marker.position = NMGLatLng(lat: data.coordinate.latitude, lng: data.coordinate.longitude)
        marker.width = CGFloat(data.width)
        marker.height = CGFloat(data.height)
        marker.zIndex = data.zIndex
        marker.angle = CGFloat(data.rotation)
        marker.isFlat = data.flat
        marker.alpha = CGFloat(data.alpha)

        marker.mapView = mapView.mapView
        markers[data.identifier] = marker

        let identifier = data.identifier
        marker.touchHandler = { [weak self] _ -> Bool in
            self?.delegate?.mapViewDidClickMarker(id: identifier)
            return true
        }

        if !data.image.isEmpty {
            loadMarkerImage(marker: marker, image: data.image)
        }
    }

    @objc public func updateMarker(_ data: ProviderMarkerData) {
        guard let marker = markers[data.identifier] else { return }

        marker.position = NMGLatLng(lat: data.coordinate.latitude, lng: data.coordinate.longitude)
        marker.width = CGFloat(data.width)
        marker.height = CGFloat(data.height)
        marker.zIndex = data.zIndex
        marker.angle = CGFloat(data.rotation)
        marker.isFlat = data.flat
        marker.alpha = CGFloat(data.alpha)

        if !data.image.isEmpty {
            loadMarkerImage(marker: marker, image: data.image)
        }
    }

    @objc public func removeMarker(identifier: String) {
        guard let marker = markers[identifier] else { return }
        marker.mapView = nil
        markers[identifier] = nil
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

    // MARK: - Polylines

    private func colorFromInt(_ value: Int) -> UIColor {
        let uValue = UInt32(bitPattern: Int32(truncatingIfNeeded: value))
        let alpha = CGFloat((uValue >> 24) & 0xFF) / 255.0
        let red = CGFloat((uValue >> 16) & 0xFF) / 255.0
        let green = CGFloat((uValue >> 8) & 0xFF) / 255.0
        let blue = CGFloat(uValue & 0xFF) / 255.0
        return UIColor(red: red, green: green, blue: blue, alpha: alpha)
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

    @objc public func addPolyline(_ data: ProviderPolylineData) {
        guard let mapView = mapView else { return }

        let coords = data.coordinates.map { NMGLatLng(lat: $0.latitude, lng: $0.longitude) }
        guard coords.count >= 2 else { return }

        let polyline = NMFPolylineOverlay(NMGLineString(points: coords))
        polyline?.width = CGFloat(data.strokeWidth)
        polyline?.color = colorFromInt(data.strokeColor)
        polyline?.zIndex = data.zIndex
        polyline?.capType = lineCapType(data.lineCap)
        polyline?.joinType = lineJoinType(data.lineJoin)

        if !data.pattern.isEmpty {
            polyline?.pattern = data.pattern.map { NSNumber(value: $0) }
        }

        polyline?.mapView = mapView.mapView
        if let polyline = polyline {
            polylines[data.identifier] = polyline
        }
    }

    @objc public func updatePolyline(_ data: ProviderPolylineData) {
        guard let polyline = polylines[data.identifier] else { return }

        let coords = data.coordinates.map { NMGLatLng(lat: $0.latitude, lng: $0.longitude) }
        if coords.count >= 2 {
            polyline.line = NMGLineString(points: coords)
        }
        polyline.width = CGFloat(data.strokeWidth)
        polyline.color = colorFromInt(data.strokeColor)
        polyline.zIndex = data.zIndex
        polyline.capType = lineCapType(data.lineCap)
        polyline.joinType = lineJoinType(data.lineJoin)

        if !data.pattern.isEmpty {
            polyline.pattern = data.pattern.map { NSNumber(value: $0) }
        }
    }

    @objc public func removePolyline(identifier: String) {
        guard let polyline = polylines[identifier] else { return }
        polyline.mapView = nil
        polylines[identifier] = nil
    }

    // MARK: - Polygons

    @objc public func addPolygon(_ data: ProviderPolygonData) {
        guard let mapView = mapView else { return }

        let coords = data.coordinates.map { NMGLatLng(lat: $0.latitude, lng: $0.longitude) }
        guard coords.count >= 3 else { return }

        let exteriorRing = NMGLineString(points: coords)

        let nmgPolygon: NMGPolygon<AnyObject>
        if data.holes.isEmpty {
            nmgPolygon = unsafeBitCast(NMGPolygon(ring: exteriorRing), to: NMGPolygon<AnyObject>.self)
        } else {
            let interiorRings = data.holes.map { hole in
                NMGLineString(points: hole.map { NMGLatLng(lat: $0.latitude, lng: $0.longitude) })
            }
            nmgPolygon = unsafeBitCast(NMGPolygon(ring: exteriorRing, interiorRings: interiorRings), to: NMGPolygon<AnyObject>.self)
        }

        let polygon = NMFPolygonOverlay(nmgPolygon)
        polygon?.fillColor = colorFromInt(data.fillColor)
        polygon?.outlineColor = colorFromInt(data.strokeColor)
        polygon?.outlineWidth = UInt(data.strokeWidth)
        polygon?.zIndex = data.zIndex
        polygon?.mapView = mapView.mapView
        if let polygon = polygon {
            polygons[data.identifier] = polygon
        }
    }

    @objc public func updatePolygon(_ data: ProviderPolygonData) {
        guard let polygon = polygons[data.identifier] else { return }

        let coords = data.coordinates.map { NMGLatLng(lat: $0.latitude, lng: $0.longitude) }
        if coords.count >= 3 {
            let exteriorRing = NMGLineString(points: coords)

            if data.holes.isEmpty {
                let nmgPolygon = NMGPolygon(ring: exteriorRing)
                polygon.polygon = unsafeBitCast(nmgPolygon, to: NMGPolygon<AnyObject>.self)
            } else {
                let interiorRings = data.holes.map { hole in
                    NMGLineString(points: hole.map { NMGLatLng(lat: $0.latitude, lng: $0.longitude) })
                }
                let nmgPolygon = NMGPolygon(ring: exteriorRing, interiorRings: interiorRings)
                polygon.polygon = unsafeBitCast(nmgPolygon, to: NMGPolygon<AnyObject>.self)
            }
        }

        polygon.fillColor = colorFromInt(data.fillColor)
        polygon.outlineColor = colorFromInt(data.strokeColor)
        polygon.outlineWidth = UInt(data.strokeWidth)
        polygon.zIndex = data.zIndex
    }

    @objc public func removePolygon(identifier: String) {
        guard let polygon = polygons[identifier] else { return }
        polygon.mapView = nil
        polygons[identifier] = nil
    }

    // MARK: - Circles

    @objc public func addCircle(_ data: ProviderCircleData) {
        guard let mapView = mapView else { return }

        let circle = NMFCircleOverlay(NMGLatLng(lat: data.center.latitude, lng: data.center.longitude), radius: data.radius)
        circle.fillColor = colorFromInt(data.fillColor)
        circle.outlineColor = colorFromInt(data.strokeColor)
        circle.outlineWidth = Double(data.strokeWidth)
        circle.zIndex = data.zIndex
        circle.mapView = mapView.mapView
        circles[data.identifier] = circle
    }

    @objc public func updateCircle(_ data: ProviderCircleData) {
        guard let circle = circles[data.identifier] else { return }

        circle.center = NMGLatLng(lat: data.center.latitude, lng: data.center.longitude)
        circle.radius = data.radius
        circle.fillColor = colorFromInt(data.fillColor)
        circle.outlineColor = colorFromInt(data.strokeColor)
        circle.outlineWidth = Double(data.strokeWidth)
        circle.zIndex = data.zIndex
    }

    @objc public func removeCircle(identifier: String) {
        guard let circle = circles[identifier] else { return }
        circle.mapView = nil
        circles[identifier] = nil
    }

    // MARK: - Paths

    @objc public func addPath(_ data: ProviderPathData) {
        guard let mapView = mapView else { return }

        let coords = data.coordinates.map { NMGLatLng(lat: $0.latitude, lng: $0.longitude) }
        guard coords.count >= 2 else { return }

        let path = NMFPath(points: coords)
        path?.width = CGFloat(data.width)
        path?.outlineWidth = CGFloat(data.outlineWidth)
        path?.color = colorFromInt(data.color)
        path?.outlineColor = colorFromInt(data.outlineColor)
        path?.passedColor = colorFromInt(data.passedColor)
        path?.passedOutlineColor = colorFromInt(data.passedOutlineColor)
        path?.progress = Double(data.progress)
        path?.zIndex = data.zIndex

        if !data.patternImage.isEmpty {
            path?.patternIcon = NMFOverlayImage(name: data.patternImage)
            path?.patternInterval = UInt(data.patternInterval)
        }

        path?.mapView = mapView.mapView
        if let path = path {
            paths[data.identifier] = path
        }
    }

    @objc public func updatePath(_ data: ProviderPathData) {
        guard let path = paths[data.identifier] else { return }

        let coords = data.coordinates.map { NMGLatLng(lat: $0.latitude, lng: $0.longitude) }
        if coords.count >= 2 {
            path.path = NMGLineString(points: coords)
        }
        path.width = CGFloat(data.width)
        path.outlineWidth = CGFloat(data.outlineWidth)
        path.color = colorFromInt(data.color)
        path.outlineColor = colorFromInt(data.outlineColor)
        path.passedColor = colorFromInt(data.passedColor)
        path.passedOutlineColor = colorFromInt(data.passedOutlineColor)
        path.progress = Double(data.progress)
        path.zIndex = data.zIndex

        if !data.patternImage.isEmpty {
            path.patternIcon = NMFOverlayImage(name: data.patternImage)
            path.patternInterval = UInt(data.patternInterval)
        }
    }

    @objc public func removePath(identifier: String) {
        guard let path = paths[identifier] else { return }
        path.mapView = nil
        paths[identifier] = nil
    }

    // MARK: - Internal

    func notifyInitialized() {
        if !isInitialized {
            isInitialized = true
            delegate?.mapViewDidInitialize()
        }
    }
}

// MARK: - NMFMapViewTouchDelegate

extension BuiltInNaverMapProvider: NMFMapViewTouchDelegate {
    public func mapView(_ mapView: NMFMapView, didTapMap latlng: NMGLatLng, point: CGPoint) {
        delegate?.mapViewDidClick(x: point.x, y: point.y, latitude: latlng.lat, longitude: latlng.lng)
    }
}

// MARK: - NMFMapViewCameraDelegate

extension BuiltInNaverMapProvider: NMFMapViewCameraDelegate {
    public func mapView(_ mapView: NMFMapView, cameraWillChangeByReason reason: Int, animated: Bool) {
        delegate?.mapViewDidTouch(reason: reason, animated: animated)
    }

    public func mapViewCameraIdle(_ mapView: NMFMapView) {
        let position = mapView.cameraPosition
        let cameraPosition = NaverMapCameraPosition(
            target: NaverMapCoordinate(latitude: position.target.lat, longitude: position.target.lng),
            zoom: position.zoom,
            tilt: position.tilt,
            bearing: position.heading
        )
        delegate?.mapViewDidChangeCamera(position: cameraPosition)
    }
}
