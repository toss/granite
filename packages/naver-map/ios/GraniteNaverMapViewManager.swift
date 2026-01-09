//
//  GraniteNaverMapViewManager.swift
//  granite-naver-map
//
//  Old Architecture ViewManager (no direct NMapsMap dependency)
//

import React
import UIKit

@objc(GraniteNaverMapViewManager)
class GraniteNaverMapViewManager: RCTViewManager {

    override func view() -> UIView! {
        let mapView = GraniteNaverMapView(frame: CGRect(x: 0, y: 0, width: 200, height: 300))
        mapView.bridge = bridge
        return mapView
    }

    override static func requiresMainQueueSetup() -> Bool {
        false
    }

    @objc static func performActionWithView(
        reactTag: NSNumber,
        bridge: RCTBridge,
        action: @escaping (GraniteNaverMapView) -> Void
    ) {
        bridge.uiManager.addUIBlock { (_, viewRegistry) in
            guard let view = viewRegistry?[reactTag] as? GraniteNaverMapView else {
                return
            }
            action(view)
        }
    }

    static let layerGroups: [String: String] = [
        "building": "building",
        "ctt": "traffic",
        "transit": "transit",
        "bike": "bicycle",
        "mountain": "mountain",
        "landparcel": "cadastral"
    ]

    @objc(setLayerGroupEnabled:withGroup:withEnabled:)
    func setLayerGroupEnabled(_ reactTag: NSNumber, withGroup group: String, withEnabled enabled: Bool) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            view.setLayerGroupEnabled(group: group, enabled: enabled)
        }
    }

    @objc(animateToCoordinate:withLatitude:withLongitude:)
    func animateToCoordinate(_ reactTag: NSNumber, withLatitude latitude: Double, withLongitude longitude: Double) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            let coord = GraniteNaverMapCoordinate(latitude: latitude, longitude: longitude)
            view.animateToCoordinate(coord)
        }
    }

    @objc(animateToTwoCoordinates:withLat1:withLng1:withLat2:withLng2:)
    func animateToTwoCoordinates(_ reactTag: NSNumber, withLat1 lat1: Double, withLng1 lng1: Double, withLat2 lat2: Double, withLng2 lng2: Double) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            let bounds = GraniteNaverMapBounds(
                southWest: GraniteNaverMapCoordinate(latitude: min(lat1, lat2), longitude: min(lng1, lng2)),
                northEast: GraniteNaverMapCoordinate(latitude: max(lat1, lat2), longitude: max(lng1, lng2))
            )
            view.animateToBounds(bounds, padding: 24.0)
        }
    }

    @objc(animateToRegion:withLatitude:withLongitude:withLatitudeDelta:withLongitudeDelta:)
    func animateToRegion(_ reactTag: NSNumber, withLatitude latitude: Double, withLongitude longitude: Double, withLatitudeDelta latitudeDelta: Double, withLongitudeDelta longitudeDelta: Double) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            let bounds = GraniteNaverMapBounds(
                southWest: GraniteNaverMapCoordinate(latitude: latitude - latitudeDelta / 2, longitude: longitude - longitudeDelta / 2),
                northEast: GraniteNaverMapCoordinate(latitude: latitude + latitudeDelta / 2, longitude: longitude + longitudeDelta / 2)
            )
            view.animateToBounds(bounds, padding: 0)
        }
    }

    @objc(addMarker:identifier:markerData:)
    func addMarker(_ reactTag: NSNumber, identifier: String, markerData: [String: Any]) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            let data = ProviderMarkerData(
                identifier: identifier,
                coordinate: GraniteNaverMapCoordinate(
                    latitude: markerData["latitude"] as? Double ?? 0,
                    longitude: markerData["longitude"] as? Double ?? 0
                ),
                width: markerData["width"] as? Int ?? 0,
                height: markerData["height"] as? Int ?? 0,
                zIndex: markerData["zIndex"] as? Int ?? 0,
                rotation: markerData["rotation"] as? Float ?? 0,
                flat: markerData["flat"] as? Bool ?? false,
                alpha: markerData["alpha"] as? Float ?? 1,
                pinColor: markerData["pinColor"] as? Int ?? 0,
                image: markerData["image"] as? String ?? ""
            )
            view.addMarker(data)
        }
    }

    @objc(updateMarker:identifier:markerData:)
    func updateMarker(_ reactTag: NSNumber, identifier: String, markerData: [String: Any]) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            let data = ProviderMarkerData(
                identifier: identifier,
                coordinate: GraniteNaverMapCoordinate(
                    latitude: markerData["latitude"] as? Double ?? 0,
                    longitude: markerData["longitude"] as? Double ?? 0
                ),
                width: markerData["width"] as? Int ?? 0,
                height: markerData["height"] as? Int ?? 0,
                zIndex: markerData["zIndex"] as? Int ?? 0,
                rotation: markerData["rotation"] as? Float ?? 0,
                flat: markerData["flat"] as? Bool ?? false,
                alpha: markerData["alpha"] as? Float ?? 1,
                pinColor: markerData["pinColor"] as? Int ?? 0,
                image: markerData["image"] as? String ?? ""
            )
            view.updateMarker(data)
        }
    }

    @objc(removeMarker:identifier:)
    func removeMarker(_ reactTag: NSNumber, identifier: String) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            view.removeMarker(identifier: identifier)
        }
    }
}
