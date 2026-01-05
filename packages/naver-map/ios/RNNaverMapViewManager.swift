//
//  RNNaverMapViewManager.swift
//  react-native-toss-naver-map
//

import NMapsMap
import React
import UIKit

@objc(RNNaverMapViewManager)
class RNNaverMapViewManager: RCTViewManager {

    var markers: [String: NMFMarker] = [:]

    override func view() -> UIView! {
        let mapView = RNNaverMapView(frame: CGRect(x: 0, y: 0, width: 200, height: 300))
        mapView.bridge = bridge
        return mapView
    }

    override static func requiresMainQueueSetup() -> Bool {
        false
    }

    @objc static func performActionWithView(
        reactTag: NSNumber,
        bridge: RCTBridge,
        action: @escaping (RNNaverMapView) -> Void
    ) {
        bridge.uiManager.addUIBlock { (_, viewRegistry) in
            guard let view = viewRegistry?[reactTag] as? RNNaverMapView else {
//                RCTLogError("Invalid view returned from registry, expecting RNNaverMapView, tag: \(reactTag)")
                return
            }
            action(view)
        }
    }

    static let NMFLayerGroup: [String: String] = [
        "building": NMF_LAYER_GROUP_BUILDING,
        "ctt": NMF_LAYER_GROUP_TRAFFIC,
        "transit": NMF_LAYER_GROUP_TRANSIT,
        "bike": NMF_LAYER_GROUP_BICYCLE,
        "mountain": NMF_LAYER_GROUP_MOUNTAIN,
        "landparcel": NMF_LAYER_GROUP_CADASTRAL
    ]

    @objc(setLayerGroupEnabled:withGroup:withEnabled:)
    func setLayerGroupEnabled(_ reactTag: NSNumber, withGroup group: String, withEnabled enabled: Bool) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            guard let layerGroup = Self.NMFLayerGroup[group] else {
                return
            }
            view.mapView.setLayerGroup(layerGroup, isEnabled: enabled)
        }
    }

    @objc(animateToCoordinate:withCoord:)
    func animateToCoordinate(_ reactTag: NSNumber, withCoord coord: NMGLatLng) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            let cameraUpdate = NMFCameraUpdate(scrollTo: coord)
            cameraUpdate.animation = .easeIn
            view.mapView.moveCamera(cameraUpdate)
        }
    }

    @objc(animateToTwoCoordinates:withCoord1:withCoord2:)
    func animateToTwoCoordinates(_ reactTag: NSNumber, withCoord1 coord1: NMGLatLng, withCoord2 coord2: NMGLatLng) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            let bounds = NMGLatLngBounds(
                southWestLat: max(coord1.lat, coord2.lat),
                southWestLng: min(coord1.lng, coord2.lng),
                northEastLat: min(coord1.lat, coord2.lat),
                northEastLng: max(coord1.lng, coord2.lng)
            )
            let cameraUpdate = NMFCameraUpdate(fit: bounds, padding: 24.0)
            cameraUpdate.animation = .easeIn
            view.mapView.moveCamera(cameraUpdate)
        }
    }

    @objc(animateToRegion:withBounds:)
    func animateToRegion(_ reactTag: NSNumber, withBounds bounds: NMGLatLngBounds) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { view in
            let cameraUpdate = NMFCameraUpdate(fit: bounds, padding: 0.0)
            cameraUpdate.animation = .easeIn
            view.mapView.moveCamera(cameraUpdate)
        }
    }

    @objc(addMarker:identifier:markerData:)
    func addMarker(_ reactTag: NSNumber, identifier: String, markerData: [String: Any]) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { [weak self] view in
            guard let self else { return }
            let mapView = view.mapView
            let data = NaverMapMarkerData(object: markerData)
            let marker = NMFMarker()
            marker.applyMarkerData(data)
            marker.mapView = mapView
            self.markers[identifier] = marker

            marker.touchHandler = { _ -> Bool in
                view.onMarkerClick?(["id": identifier])
                return true
            }
        }
    }

    @objc(updateMarker:identifier:markerData:)
    func updateMarker(_ reactTag: NSNumber, identifier: String, markerData: [String: Any]) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { [weak self] view in
            guard let self else { return }
            let mapView = view.mapView
            guard let marker = self.markers[identifier] else {
                return
            }
            let data = NaverMapMarkerData(object: markerData)
            marker.applyMarkerData(data)
            marker.mapView = mapView
        }
    }

    @objc(removeMarker:identifier:)
    func removeMarker(_ reactTag: NSNumber, identifier: String) {
        Self.performActionWithView(reactTag: reactTag, bridge: bridge) { [weak self] _ in
            guard let self else { return }
            guard let marker = self.markers[identifier] else {
                return
            }
            marker.mapView = nil
            self.markers[identifier] = nil
        }
    }

    @objc func moveCamera(_ update: NMFCameraUpdate, view: UIView) {
        guard let mapView = view as? RNNaverMapView else {
            return
        }
        Task { @MainActor [weak mapView] in
            guard let mapView = mapView?.mapView else { return }
            mapView.moveCamera(update)
        }
    }
}
