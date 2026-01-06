//
//  GraniteNaverMapProvider.swift
//  granite-naver-map
//
//  Pluggable Provider protocol for NaverMap
//

import UIKit

// MARK: - Provider Enums

@objc public enum GraniteNaverMapType: Int {
    case basic = 0
    case navi = 1
    case satellite = 2
    case hybrid = 3
    case terrain = 4
    case none = 5
}

@objc public enum GraniteNaverMapLocationTrackingMode: Int {
    case none = 0
    case noFollow = 1
    case follow = 2
    case face = 3
}

// MARK: - Data Types

@objc public class GraniteNaverMapCoordinate: NSObject {
    @objc public let latitude: Double
    @objc public let longitude: Double

    @objc public init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }
}

@objc public class GraniteNaverMapCameraPosition: NSObject {
    @objc public let target: GraniteNaverMapCoordinate
    @objc public let zoom: Double
    @objc public let tilt: Double
    @objc public let bearing: Double

    @objc public init(target: GraniteNaverMapCoordinate, zoom: Double, tilt: Double = 0, bearing: Double = 0) {
        self.target = target
        self.zoom = zoom
        self.tilt = tilt
        self.bearing = bearing
    }
}

@objc public class GraniteNaverMapBounds: NSObject {
    @objc public let southWest: GraniteNaverMapCoordinate
    @objc public let northEast: GraniteNaverMapCoordinate

    @objc public init(southWest: GraniteNaverMapCoordinate, northEast: GraniteNaverMapCoordinate) {
        self.southWest = southWest
        self.northEast = northEast
    }
}

// MARK: - Marker Data

@objc public class ProviderMarkerData: NSObject {
    @objc public let identifier: String
    @objc public let coordinate: GraniteNaverMapCoordinate
    @objc public let width: Int
    @objc public let height: Int
    @objc public let zIndex: Int
    @objc public let rotation: Float
    @objc public let flat: Bool
    @objc public let alpha: Float
    @objc public let pinColor: Int
    @objc public let image: String

    @objc public init(
        identifier: String,
        coordinate: GraniteNaverMapCoordinate,
        width: Int,
        height: Int,
        zIndex: Int,
        rotation: Float,
        flat: Bool,
        alpha: Float,
        pinColor: Int,
        image: String
    ) {
        self.identifier = identifier
        self.coordinate = coordinate
        self.width = width
        self.height = height
        self.zIndex = zIndex
        self.rotation = rotation
        self.flat = flat
        self.alpha = alpha
        self.pinColor = pinColor
        self.image = image
    }
}

// MARK: - Overlay Data

@objc public class ProviderPolylineData: NSObject {
    @objc public let identifier: String
    @objc public let coordinates: [GraniteNaverMapCoordinate]
    @objc public let strokeWidth: Float
    @objc public let strokeColor: Int
    @objc public let zIndex: Int
    @objc public let lineCap: Int
    @objc public let lineJoin: Int
    @objc public let pattern: [Int]

    @objc public init(
        identifier: String,
        coordinates: [GraniteNaverMapCoordinate],
        strokeWidth: Float,
        strokeColor: Int,
        zIndex: Int,
        lineCap: Int,
        lineJoin: Int,
        pattern: [Int]
    ) {
        self.identifier = identifier
        self.coordinates = coordinates
        self.strokeWidth = strokeWidth
        self.strokeColor = strokeColor
        self.zIndex = zIndex
        self.lineCap = lineCap
        self.lineJoin = lineJoin
        self.pattern = pattern
    }
}

@objc public class ProviderPolygonData: NSObject {
    @objc public let identifier: String
    @objc public let coordinates: [GraniteNaverMapCoordinate]
    @objc public let holes: [[GraniteNaverMapCoordinate]]
    @objc public let fillColor: Int
    @objc public let strokeColor: Int
    @objc public let strokeWidth: Float
    @objc public let zIndex: Int

    @objc public init(
        identifier: String,
        coordinates: [GraniteNaverMapCoordinate],
        holes: [[GraniteNaverMapCoordinate]],
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        self.identifier = identifier
        self.coordinates = coordinates
        self.holes = holes
        self.fillColor = fillColor
        self.strokeColor = strokeColor
        self.strokeWidth = strokeWidth
        self.zIndex = zIndex
    }
}

@objc public class ProviderCircleData: NSObject {
    @objc public let identifier: String
    @objc public let center: GraniteNaverMapCoordinate
    @objc public let radius: Double
    @objc public let fillColor: Int
    @objc public let strokeColor: Int
    @objc public let strokeWidth: Float
    @objc public let zIndex: Int

    @objc public init(
        identifier: String,
        center: GraniteNaverMapCoordinate,
        radius: Double,
        fillColor: Int,
        strokeColor: Int,
        strokeWidth: Float,
        zIndex: Int
    ) {
        self.identifier = identifier
        self.center = center
        self.radius = radius
        self.fillColor = fillColor
        self.strokeColor = strokeColor
        self.strokeWidth = strokeWidth
        self.zIndex = zIndex
    }
}

@objc public class ProviderPathData: NSObject {
    @objc public let identifier: String
    @objc public let coordinates: [GraniteNaverMapCoordinate]
    @objc public let width: Float
    @objc public let outlineWidth: Float
    @objc public let color: Int
    @objc public let outlineColor: Int
    @objc public let passedColor: Int
    @objc public let passedOutlineColor: Int
    @objc public let patternImage: String
    @objc public let patternInterval: Int
    @objc public let progress: Float
    @objc public let zIndex: Int

    @objc public init(
        identifier: String,
        coordinates: [GraniteNaverMapCoordinate],
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
        self.identifier = identifier
        self.coordinates = coordinates
        self.width = width
        self.outlineWidth = outlineWidth
        self.color = color
        self.outlineColor = outlineColor
        self.passedColor = passedColor
        self.passedOutlineColor = passedOutlineColor
        self.patternImage = patternImage
        self.patternInterval = patternInterval
        self.progress = progress
        self.zIndex = zIndex
    }
}

// MARK: - Provider Delegate

@objc public protocol GraniteNaverMapProviderDelegate: NSObjectProtocol {
    @objc func mapViewDidInitialize()
    @objc func mapViewDidChangeCamera(position: GraniteNaverMapCameraPosition)
    @objc func mapViewDidTouch(reason: Int, animated: Bool)
    @objc func mapViewDidClick(x: Double, y: Double, latitude: Double, longitude: Double)
    @objc func mapViewDidClickMarker(id: String)
}

// MARK: - Provider Protocol

@objc public protocol GraniteNaverMapProvidable: NSObjectProtocol {
    /// Create the map view
    @objc func createMapView(frame: CGRect) -> UIView

    /// Set the delegate for map events
    @objc func setDelegate(_ delegate: GraniteNaverMapProviderDelegate?)

    // MARK: - Camera
    @objc func moveCamera(to position: GraniteNaverMapCameraPosition, animated: Bool)
    @objc func animateToCoordinate(_ coordinate: GraniteNaverMapCoordinate)
    @objc func animateToBounds(_ bounds: GraniteNaverMapBounds, padding: CGFloat)

    // MARK: - Map Properties
    @objc func setMapType(_ type: GraniteNaverMapType)
    @objc func setMapPadding(_ padding: UIEdgeInsets)
    @objc func setCompassEnabled(_ enabled: Bool)
    @objc func setScaleBarEnabled(_ enabled: Bool)
    @objc func setZoomControlEnabled(_ enabled: Bool)
    @objc func setLocationButtonEnabled(_ enabled: Bool)
    @objc func setBuildingHeight(_ height: Float)
    @objc func setNightModeEnabled(_ enabled: Bool)
    @objc func setMinZoomLevel(_ level: Double)
    @objc func setMaxZoomLevel(_ level: Double)
    @objc func setScrollGesturesEnabled(_ enabled: Bool)
    @objc func setZoomGesturesEnabled(_ enabled: Bool)
    @objc func setTiltGesturesEnabled(_ enabled: Bool)
    @objc func setRotateGesturesEnabled(_ enabled: Bool)
    @objc func setStopGesturesEnabled(_ enabled: Bool)
    @objc func setLocationTrackingMode(_ mode: GraniteNaverMapLocationTrackingMode)
    @objc func setLayerGroupEnabled(group: String, enabled: Bool)

    // MARK: - Markers
    @objc func addMarker(_ data: ProviderMarkerData)
    @objc func updateMarker(_ data: ProviderMarkerData)
    @objc func removeMarker(identifier: String)

    // MARK: - Polylines
    @objc func addPolyline(_ data: ProviderPolylineData)
    @objc func updatePolyline(_ data: ProviderPolylineData)
    @objc func removePolyline(identifier: String)

    // MARK: - Polygons
    @objc func addPolygon(_ data: ProviderPolygonData)
    @objc func updatePolygon(_ data: ProviderPolygonData)
    @objc func removePolygon(identifier: String)

    // MARK: - Circles
    @objc func addCircle(_ data: ProviderCircleData)
    @objc func updateCircle(_ data: ProviderCircleData)
    @objc func removeCircle(identifier: String)

    // MARK: - Paths
    @objc func addPath(_ data: ProviderPathData)
    @objc func updatePath(_ data: ProviderPathData)
    @objc func removePath(identifier: String)
}
