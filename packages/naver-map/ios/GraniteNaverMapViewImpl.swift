//
//  GraniteNaverMapViewImpl.swift
//  granite-naver-map
//
//  Provider-based implementation of NaverMapView (no direct NMapsMap dependency)
//

import UIKit

@objc public protocol GraniteNaverMapViewDelegate: AnyObject {
    @objc func mapViewDidInitialize()
    @objc func mapViewDidChangeCamera(latitude: Double, longitude: Double, zoom: Double)
    @objc func mapViewDidTouch(reason: Int, animated: Bool)
    @objc func mapViewDidClick(x: Double, y: Double, latitude: Double, longitude: Double)
    @objc func mapViewDidClickMarker(id: String)
}

@objc public class GraniteNaverMapViewImpl: UIView {
    @objc public weak var eventDelegate: GraniteNaverMapViewDelegate?

    private var provider: GraniteNaverMapProvidable?
    private var mapContentView: UIView?
    private var isInitialized = false

    public override init(frame: CGRect) {
        super.init(frame: frame)
        setupProvider()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupProvider() {
        guard let provider = GraniteNaverMapRegistry.shared.getProvider() else {
            // No provider available - show placeholder or error
            let label = UILabel(frame: bounds)
            label.text = "NaverMap provider not registered"
            label.textAlignment = .center
            label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            addSubview(label)
            return
        }

        self.provider = provider
        provider.setDelegate(self)

        let mapView = provider.createMapView(frame: bounds)
        mapView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(mapView)
        self.mapContentView = mapView
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
        let position = GraniteNaverMapCameraPosition(
            target: GraniteNaverMapCoordinate(latitude: latitude, longitude: longitude),
            zoom: zoom,
            tilt: tilt,
            bearing: bearing
        )
        provider?.moveCamera(to: position, animated: false)
    }

    @objc public func setMapType(_ type: Int) {
        guard let mapType = GraniteNaverMapType(rawValue: type) else { return }
        provider?.setMapType(mapType)
    }

    @objc public var mapPadding: UIEdgeInsets = .zero {
        didSet {
            provider?.setMapPadding(mapPadding)
        }
    }

    @objc public var compass: Bool = true {
        didSet {
            provider?.setCompassEnabled(compass)
        }
    }

    @objc public var scaleBar: Bool = true {
        didSet {
            provider?.setScaleBarEnabled(scaleBar)
        }
    }

    @objc public var zoomControl: Bool = true {
        didSet {
            provider?.setZoomControlEnabled(zoomControl)
        }
    }

    @objc public var buildingHeight: Float = 1.0 {
        didSet {
            provider?.setBuildingHeight(buildingHeight)
        }
    }

    @objc public var nightMode: Bool = false {
        didSet {
            provider?.setNightModeEnabled(nightMode)
        }
    }

    @objc public var minZoomLevel: Double = 0 {
        didSet {
            provider?.setMinZoomLevel(minZoomLevel)
        }
    }

    @objc public var maxZoomLevel: Double = 21 {
        didSet {
            provider?.setMaxZoomLevel(maxZoomLevel)
        }
    }

    @objc public var scrollGesturesEnabled: Bool = true {
        didSet {
            provider?.setScrollGesturesEnabled(scrollGesturesEnabled)
        }
    }

    @objc public var tiltGesturesEnabled: Bool = true {
        didSet {
            provider?.setTiltGesturesEnabled(tiltGesturesEnabled)
        }
    }

    @objc public var rotateGesturesEnabled: Bool = true {
        didSet {
            provider?.setRotateGesturesEnabled(rotateGesturesEnabled)
        }
    }

    @objc public var stopGesturesEnabled: Bool = true {
        didSet {
            provider?.setStopGesturesEnabled(stopGesturesEnabled)
        }
    }

    @objc public var locationTrackingMode: Int = 0 {
        didSet {
            guard let mode = GraniteNaverMapLocationTrackingMode(rawValue: locationTrackingMode) else { return }
            provider?.setLocationTrackingMode(mode)
        }
    }

    @objc public var showsMyLocationButton: Bool = false {
        didSet {
            provider?.setLocationButtonEnabled(showsMyLocationButton)
        }
    }

    @objc public var zoomGesturesEnabled: Bool = true {
        didSet {
            provider?.setZoomGesturesEnabled(zoomGesturesEnabled)
        }
    }

    // MARK: - Commands

    @objc public func animateToCoordinate(latitude: Double, longitude: Double) {
        let coord = GraniteNaverMapCoordinate(latitude: latitude, longitude: longitude)
        provider?.animateToCoordinate(coord)
    }

    @objc public func animateToTwoCoordinates(lat1: Double, lng1: Double, lat2: Double, lng2: Double) {
        let bounds = GraniteNaverMapBounds(
            southWest: GraniteNaverMapCoordinate(latitude: min(lat1, lat2), longitude: min(lng1, lng2)),
            northEast: GraniteNaverMapCoordinate(latitude: max(lat1, lat2), longitude: max(lng1, lng2))
        )
        provider?.animateToBounds(bounds, padding: 24.0)
    }

    @objc public func animateToRegion(latitude: Double, longitude: Double, latitudeDelta: Double, longitudeDelta: Double) {
        let bounds = GraniteNaverMapBounds(
            southWest: GraniteNaverMapCoordinate(latitude: latitude - latitudeDelta / 2, longitude: longitude - longitudeDelta / 2),
            northEast: GraniteNaverMapCoordinate(latitude: latitude + latitudeDelta / 2, longitude: longitude + longitudeDelta / 2)
        )
        provider?.animateToBounds(bounds, padding: 0)
    }

    @objc public func setLayerGroupEnabled(group: String, enabled: Bool) {
        provider?.setLayerGroupEnabled(group: group, enabled: enabled)
    }

    // MARK: - Marker Commands

    @objc public func addMarker(identifier: String, latitude: Double, longitude: Double, width: Int, height: Int, zIndex: Int, rotation: Float, flat: Bool, alpha: Float, pinColor: Int, image: String) {
        let data = ProviderMarkerData(
            identifier: identifier,
            coordinate: GraniteNaverMapCoordinate(latitude: latitude, longitude: longitude),
            width: width,
            height: height,
            zIndex: zIndex,
            rotation: rotation,
            flat: flat,
            alpha: alpha,
            pinColor: pinColor,
            image: image
        )
        provider?.addMarker(data)
    }

    @objc public func updateMarker(identifier: String, latitude: Double, longitude: Double, width: Int, height: Int, zIndex: Int, rotation: Float, flat: Bool, alpha: Float, pinColor: Int, image: String) {
        let data = ProviderMarkerData(
            identifier: identifier,
            coordinate: GraniteNaverMapCoordinate(latitude: latitude, longitude: longitude),
            width: width,
            height: height,
            zIndex: zIndex,
            rotation: rotation,
            flat: flat,
            alpha: alpha,
            pinColor: pinColor,
            image: image
        )
        provider?.updateMarker(data)
    }

    @objc public func removeMarker(identifier: String) {
        provider?.removeMarker(identifier: identifier)
    }

    // MARK: - Polyline Commands

    private func parseCoordinates(_ json: String) -> [GraniteNaverMapCoordinate] {
        guard let data = json.data(using: .utf8),
              let coords = try? JSONSerialization.jsonObject(with: data) as? [[String: Double]] else {
            return []
        }
        return coords.compactMap { coord in
            guard let lat = coord["latitude"], let lng = coord["longitude"] else { return nil }
            return GraniteNaverMapCoordinate(latitude: lat, longitude: lng)
        }
    }

    private func parsePattern(_ json: String) -> [Int] {
        guard let data = json.data(using: .utf8),
              let pattern = try? JSONSerialization.jsonObject(with: data) as? [Int] else {
            return []
        }
        return pattern
    }

    @objc public func addPolyline(identifier: String, coordsJson: String, strokeWidth: Float, strokeColor: Int, zIndex: Int, lineCap: Int, lineJoin: Int, patternJson: String) {
        let coords = parseCoordinates(coordsJson)
        guard coords.count >= 2 else { return }

        let data = ProviderPolylineData(
            identifier: identifier,
            coordinates: coords,
            strokeWidth: strokeWidth,
            strokeColor: strokeColor,
            zIndex: zIndex,
            lineCap: lineCap,
            lineJoin: lineJoin,
            pattern: parsePattern(patternJson)
        )
        provider?.addPolyline(data)
    }

    @objc public func updatePolyline(identifier: String, coordsJson: String, strokeWidth: Float, strokeColor: Int, zIndex: Int, lineCap: Int, lineJoin: Int, patternJson: String) {
        let coords = parseCoordinates(coordsJson)
        guard coords.count >= 2 else { return }

        let data = ProviderPolylineData(
            identifier: identifier,
            coordinates: coords,
            strokeWidth: strokeWidth,
            strokeColor: strokeColor,
            zIndex: zIndex,
            lineCap: lineCap,
            lineJoin: lineJoin,
            pattern: parsePattern(patternJson)
        )
        provider?.updatePolyline(data)
    }

    @objc public func removePolyline(identifier: String) {
        provider?.removePolyline(identifier: identifier)
    }

    // MARK: - Polygon Commands

    private func parseHoles(_ json: String) -> [[GraniteNaverMapCoordinate]] {
        guard let data = json.data(using: .utf8),
              let holes = try? JSONSerialization.jsonObject(with: data) as? [[[String: Double]]] else {
            return []
        }
        return holes.map { hole in
            hole.compactMap { coord in
                guard let lat = coord["latitude"], let lng = coord["longitude"] else { return nil }
                return GraniteNaverMapCoordinate(latitude: lat, longitude: lng)
            }
        }
    }

    @objc public func addPolygon(identifier: String, coordsJson: String, holesJson: String, fillColor: Int, strokeColor: Int, strokeWidth: Float, zIndex: Int) {
        let coords = parseCoordinates(coordsJson)
        guard coords.count >= 3 else { return }

        let data = ProviderPolygonData(
            identifier: identifier,
            coordinates: coords,
            holes: parseHoles(holesJson),
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth,
            zIndex: zIndex
        )
        provider?.addPolygon(data)
    }

    @objc public func updatePolygon(identifier: String, coordsJson: String, holesJson: String, fillColor: Int, strokeColor: Int, strokeWidth: Float, zIndex: Int) {
        let coords = parseCoordinates(coordsJson)
        guard coords.count >= 3 else { return }

        let data = ProviderPolygonData(
            identifier: identifier,
            coordinates: coords,
            holes: parseHoles(holesJson),
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth,
            zIndex: zIndex
        )
        provider?.updatePolygon(data)
    }

    @objc public func removePolygon(identifier: String) {
        provider?.removePolygon(identifier: identifier)
    }

    // MARK: - Circle Commands

    @objc public func addCircle(identifier: String, latitude: Double, longitude: Double, radius: Double, fillColor: Int, strokeColor: Int, strokeWidth: Float, zIndex: Int) {
        let data = ProviderCircleData(
            identifier: identifier,
            center: GraniteNaverMapCoordinate(latitude: latitude, longitude: longitude),
            radius: radius,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth,
            zIndex: zIndex
        )
        provider?.addCircle(data)
    }

    @objc public func updateCircle(identifier: String, latitude: Double, longitude: Double, radius: Double, fillColor: Int, strokeColor: Int, strokeWidth: Float, zIndex: Int) {
        let data = ProviderCircleData(
            identifier: identifier,
            center: GraniteNaverMapCoordinate(latitude: latitude, longitude: longitude),
            radius: radius,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWidth: strokeWidth,
            zIndex: zIndex
        )
        provider?.updateCircle(data)
    }

    @objc public func removeCircle(identifier: String) {
        provider?.removeCircle(identifier: identifier)
    }

    // MARK: - Path Commands

    @objc public func addPath(identifier: String, coordsJson: String, width: Float, outlineWidth: Float, color: Int, outlineColor: Int, passedColor: Int, passedOutlineColor: Int, patternImage: String, patternInterval: Int, progress: Float, zIndex: Int) {
        let coords = parseCoordinates(coordsJson)
        guard coords.count >= 2 else { return }

        let data = ProviderPathData(
            identifier: identifier,
            coordinates: coords,
            width: width,
            outlineWidth: outlineWidth,
            color: color,
            outlineColor: outlineColor,
            passedColor: passedColor,
            passedOutlineColor: passedOutlineColor,
            patternImage: patternImage,
            patternInterval: patternInterval,
            progress: progress,
            zIndex: zIndex
        )
        provider?.addPath(data)
    }

    @objc public func updatePath(identifier: String, coordsJson: String, width: Float, outlineWidth: Float, color: Int, outlineColor: Int, passedColor: Int, passedOutlineColor: Int, patternImage: String, patternInterval: Int, progress: Float, zIndex: Int) {
        let coords = parseCoordinates(coordsJson)
        guard coords.count >= 2 else { return }

        let data = ProviderPathData(
            identifier: identifier,
            coordinates: coords,
            width: width,
            outlineWidth: outlineWidth,
            color: color,
            outlineColor: outlineColor,
            passedColor: passedColor,
            passedOutlineColor: passedOutlineColor,
            patternImage: patternImage,
            patternInterval: patternInterval,
            progress: progress,
            zIndex: zIndex
        )
        provider?.updatePath(data)
    }

    @objc public func removePath(identifier: String) {
        provider?.removePath(identifier: identifier)
    }

    // MARK: - ArrowheadPath Commands (delegated to Path for now)

    @objc public func addArrowheadPath(identifier: String, coordsJson: String, width: Float, outlineWidth: Float, color: Int, outlineColor: Int, headSizeRatio: Float, zIndex: Int) {
        // ArrowheadPath uses the same path API with default passed colors
        addPath(identifier: identifier, coordsJson: coordsJson, width: width, outlineWidth: outlineWidth, color: color, outlineColor: outlineColor, passedColor: color, passedOutlineColor: outlineColor, patternImage: "", patternInterval: 0, progress: 0, zIndex: zIndex)
    }

    @objc public func updateArrowheadPath(identifier: String, coordsJson: String, width: Float, outlineWidth: Float, color: Int, outlineColor: Int, headSizeRatio: Float, zIndex: Int) {
        updatePath(identifier: identifier, coordsJson: coordsJson, width: width, outlineWidth: outlineWidth, color: color, outlineColor: outlineColor, passedColor: color, passedOutlineColor: outlineColor, patternImage: "", patternInterval: 0, progress: 0, zIndex: zIndex)
    }

    @objc public func removeArrowheadPath(identifier: String) {
        removePath(identifier: identifier)
    }

    // MARK: - GroundOverlay Commands (requires provider extension)

    @objc public func addGroundOverlay(identifier: String, southWestLat: Double, southWestLng: Double, northEastLat: Double, northEastLng: Double, image: String, alpha: Float, zIndex: Int) {
        // TODO: Add ground overlay support to provider protocol
    }

    @objc public func updateGroundOverlay(identifier: String, southWestLat: Double, southWestLng: Double, northEastLat: Double, northEastLng: Double, image: String, alpha: Float, zIndex: Int) {
        // TODO: Add ground overlay support to provider protocol
    }

    @objc public func removeGroundOverlay(identifier: String) {
        // TODO: Add ground overlay support to provider protocol
    }

    // MARK: - InfoWindow Commands (requires provider extension)

    @objc public func addInfoWindow(identifier: String, latitude: Double, longitude: Double, text: String, alpha: Float, zIndex: Int, offsetX: Int, offsetY: Int) {
        // TODO: Add info window support to provider protocol
    }

    @objc public func updateInfoWindow(identifier: String, latitude: Double, longitude: Double, text: String, alpha: Float, zIndex: Int, offsetX: Int, offsetY: Int) {
        // TODO: Add info window support to provider protocol
    }

    @objc public func removeInfoWindow(identifier: String) {
        // TODO: Add info window support to provider protocol
    }
}

// MARK: - GraniteNaverMapProviderDelegate

extension GraniteNaverMapViewImpl: GraniteNaverMapProviderDelegate {
    public func mapViewDidInitialize() {
        eventDelegate?.mapViewDidInitialize()
    }

    public func mapViewDidChangeCamera(position: GraniteNaverMapCameraPosition) {
        eventDelegate?.mapViewDidChangeCamera(
            latitude: position.target.latitude,
            longitude: position.target.longitude,
            zoom: position.zoom
        )
    }

    public func mapViewDidTouch(reason: Int, animated: Bool) {
        eventDelegate?.mapViewDidTouch(reason: reason, animated: animated)
    }

    public func mapViewDidClick(x: Double, y: Double, latitude: Double, longitude: Double) {
        eventDelegate?.mapViewDidClick(x: x, y: y, latitude: latitude, longitude: longitude)
    }

    public func mapViewDidClickMarker(id: String) {
        eventDelegate?.mapViewDidClickMarker(id: id)
    }
}
