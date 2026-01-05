//
//  RNNaverMapView.swift
//  react-native-toss-naver-map
//

import NMapsMap
import React
import UIKit

class RNNaverMapView: NMFNaverMapView {
    weak var bridge: RCTBridge?

    @objc var onInitialized: RCTDirectEventBlock?
    @objc var onCameraChange: RCTDirectEventBlock?
    @objc var onTouch: RCTDirectEventBlock?
    @objc var onMapClick: RCTDirectEventBlock?
    @objc var onMarkerClick: RCTDirectEventBlock?

    override init(frame: CGRect) {
        super.init(frame: frame)
        mapView.touchDelegate = self
        mapView.addCameraDelegate(delegate: self)
        mapView.addOptionDelegate(delegate: self)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc func setMapType(_ type: Int) {
        guard let mapType = NMFMapType(rawValue: type) else {
            return
        }
        mapView.mapType = mapType
    }

    @objc var mapPadding: UIEdgeInsets {
        get { mapView.contentInset }
        set { mapView.contentInset = newValue }
    }

    @objc var compass: Bool {
        get { showCompass }
        set { showCompass = newValue }
    }

    @objc var scaleBar: Bool {
        get { showScaleBar }
        set { showScaleBar = newValue }
    }

    @objc var zoomControl: Bool {
        get { showZoomControls }
        set { showZoomControls = newValue }
    }

    @objc var buildingHeight: Float {
        get { mapView.buildingHeight }
        set { mapView.buildingHeight = newValue }
    }

    @objc var nightMode: Bool {
        get { mapView.isNightModeEnabled }
        set { mapView.isNightModeEnabled = newValue }
    }

    @objc var minZoomLevel: Double {
        get { mapView.minZoomLevel }
        set { mapView.minZoomLevel = newValue }
    }

    @objc var maxZoomLevel: Double {
        get { mapView.maxZoomLevel }
        set { mapView.maxZoomLevel = newValue }
    }

    @objc var scrollGesturesEnabled: Bool {
        get { mapView.isScrollGestureEnabled }
        set { mapView.isScrollGestureEnabled = newValue }
    }

    @objc var tiltGesturesEnabled: Bool {
        get { mapView.isTiltGestureEnabled }
        set { mapView.isTiltGestureEnabled = newValue }
    }

    @objc var rotateGesturesEnabled: Bool {
        get { mapView.isRotateGestureEnabled }
        set { mapView.isRotateGestureEnabled = newValue }
    }

    @objc var stopGesturesEnabled: Bool {
        get { mapView.isStopGestureEnabled }
        set { mapView.isStopGestureEnabled = newValue }
    }

    @objc var tilt: Bool {
        get { mapView.allowsTilting }
        set { mapView.allowsTilting = newValue }
    }

    @objc var locationTrackingMode: UInt {
        get { mapView.positionMode.rawValue }
        set { mapView.positionMode = NMFMyPositionMode(rawValue: newValue) ?? .disabled }
    }

    @objc var showsMyLocationButton: Bool {
        get { showLocationButton }
        set { showLocationButton = newValue }
    }

    @objc var zoomGesturesEnabled: Bool {
        get { mapView.isZoomGestureEnabled }
        set { mapView.isZoomGestureEnabled = newValue }
    }
}

// MARK: - NMFMapViewTouchDelegate
extension RNNaverMapView: NMFMapViewTouchDelegate {
    func mapView(_ mapView: NMFMapView, didTapMap latlng: NMGLatLng, point: CGPoint) {
        onMapClick?([
            "x": point.x,
            "y": point.y,
            "latitude": latlng.lat,
            "longitude": latlng.lng
        ])
    }
}

// MARK: - NMFMapViewCameraDelegate
extension RNNaverMapView: NMFMapViewCameraDelegate {
    func mapView(_ mapView: NMFMapView, cameraWillChangeByReason reason: Int, animated: Bool) {
        onTouch?(["animated": animated, "reason": reason])
    }

    func mapViewCameraIdle(_ mapView: NMFMapView) {
        let contentRegion = mapView.contentRegion.exteriorRing.points
            .compactMap { $0 as? NMGLatLng }
            .map { ["latitude": $0.lat, "longitude": $0.lng] }

        let coveringRegion = mapView.coveringRegion.exteriorRing.points
            .compactMap { $0 as? NMGLatLng }
            .map { ["latitude": $0.lat, "longitude": $0.lng] }

        onCameraChange?([
            "latitude": mapView.cameraPosition.target.lat,
            "longitude": mapView.cameraPosition.target.lng,
            "zoom": mapView.cameraPosition.zoom,
            "contentRegion": contentRegion,
            "coveringRegion": coveringRegion
        ])
    }
}

// MARK: - NMFMapViewOptionDelegate
extension RNNaverMapView: NMFMapViewOptionDelegate {
    func mapViewOptionChanged(_ mapView: NMFMapView) {
        // Handle option changes if needed
    }
}
