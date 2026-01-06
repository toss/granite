//
//  GraniteNaverMapViewWrapper.swift
//  granite-naver-map
//
//  Provider-based wrapper for Old Architecture (no direct NMapsMap dependency)
//

import React
import UIKit

class GraniteNaverMapView: UIView {
    weak var bridge: RCTBridge?

    @objc var onInitialized: RCTDirectEventBlock?
    @objc var onCameraChange: RCTDirectEventBlock?
    @objc var onTouch: RCTDirectEventBlock?
    @objc var onMapClick: RCTDirectEventBlock?
    @objc var onMarkerClick: RCTDirectEventBlock?

    private var provider: GraniteNaverMapProvidable?
    private var mapContentView: UIView?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupProvider()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupProvider() {
        // Create a new provider instance for this view
        guard let provider = GraniteNaverMapRegistry.shared.createProvider() else {
            // No provider factory available - show placeholder or error
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

    // MARK: - Property Setters

    @objc func setMapType(_ type: Int) {
        guard let mapType = GraniteNaverMapType(rawValue: type) else { return }
        provider?.setMapType(mapType)
    }

    @objc var mapPadding: UIEdgeInsets = .zero {
        didSet {
            provider?.setMapPadding(mapPadding)
        }
    }

    @objc var compass: Bool = true {
        didSet {
            provider?.setCompassEnabled(compass)
        }
    }

    @objc var scaleBar: Bool = true {
        didSet {
            provider?.setScaleBarEnabled(scaleBar)
        }
    }

    @objc var zoomControl: Bool = true {
        didSet {
            provider?.setZoomControlEnabled(zoomControl)
        }
    }

    @objc var buildingHeight: Float = 1.0 {
        didSet {
            provider?.setBuildingHeight(buildingHeight)
        }
    }

    @objc var nightMode: Bool = false {
        didSet {
            provider?.setNightModeEnabled(nightMode)
        }
    }

    @objc var minZoomLevel: Double = 0 {
        didSet {
            provider?.setMinZoomLevel(minZoomLevel)
        }
    }

    @objc var maxZoomLevel: Double = 21 {
        didSet {
            provider?.setMaxZoomLevel(maxZoomLevel)
        }
    }

    @objc var scrollGesturesEnabled: Bool = true {
        didSet {
            provider?.setScrollGesturesEnabled(scrollGesturesEnabled)
        }
    }

    @objc var tiltGesturesEnabled: Bool = true {
        didSet {
            provider?.setTiltGesturesEnabled(tiltGesturesEnabled)
        }
    }

    @objc var rotateGesturesEnabled: Bool = true {
        didSet {
            provider?.setRotateGesturesEnabled(rotateGesturesEnabled)
        }
    }

    @objc var stopGesturesEnabled: Bool = true {
        didSet {
            provider?.setStopGesturesEnabled(stopGesturesEnabled)
        }
    }

    @objc var tilt: Bool = true {
        didSet {
            provider?.setTiltGesturesEnabled(tilt)
        }
    }

    @objc var locationTrackingMode: UInt = 0 {
        didSet {
            guard let mode = GraniteNaverMapLocationTrackingMode(rawValue: Int(locationTrackingMode)) else { return }
            provider?.setLocationTrackingMode(mode)
        }
    }

    @objc var showsMyLocationButton: Bool = false {
        didSet {
            provider?.setLocationButtonEnabled(showsMyLocationButton)
        }
    }

    @objc var zoomGesturesEnabled: Bool = true {
        didSet {
            provider?.setZoomGesturesEnabled(zoomGesturesEnabled)
        }
    }

    // MARK: - Commands

    func animateToCoordinate(_ coord: GraniteNaverMapCoordinate) {
        provider?.animateToCoordinate(coord)
    }

    func animateToBounds(_ bounds: GraniteNaverMapBounds, padding: CGFloat) {
        provider?.animateToBounds(bounds, padding: padding)
    }

    func setLayerGroupEnabled(group: String, enabled: Bool) {
        provider?.setLayerGroupEnabled(group: group, enabled: enabled)
    }

    func addMarker(_ data: ProviderMarkerData) {
        provider?.addMarker(data)
    }

    func updateMarker(_ data: ProviderMarkerData) {
        provider?.updateMarker(data)
    }

    func removeMarker(identifier: String) {
        provider?.removeMarker(identifier: identifier)
    }
}

// MARK: - GraniteNaverMapProviderDelegate

extension GraniteNaverMapView: GraniteNaverMapProviderDelegate {
    func mapViewDidInitialize() {
        onInitialized?([:])
    }

    func mapViewDidChangeCamera(position: GraniteNaverMapCameraPosition) {
        onCameraChange?([
            "latitude": position.target.latitude,
            "longitude": position.target.longitude,
            "zoom": position.zoom
        ])
    }

    func mapViewDidTouch(reason: Int, animated: Bool) {
        onTouch?(["animated": animated, "reason": reason])
    }

    func mapViewDidClick(x: Double, y: Double, latitude: Double, longitude: Double) {
        onMapClick?([
            "x": x,
            "y": y,
            "latitude": latitude,
            "longitude": longitude
        ])
    }

    func mapViewDidClickMarker(id: String) {
        onMarkerClick?(["id": id])
    }
}
