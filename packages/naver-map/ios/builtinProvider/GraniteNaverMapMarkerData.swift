//
//  GraniteNaverMapMarkerData.swift
//  granite-naver-map
//

import Foundation
import NMapsMap
import React

struct GraniteNaverMapMarkerData {
    let coordinate: NMGLatLng?
    let width: CGFloat?
    let height: CGFloat?
    let zIndex: Int?
    let image: String?
    let rotation: CGFloat?
    let flat: Bool?
    let alpha: CGFloat?
    let pinColor: UIColor?

    init(
        coordinate: NMGLatLng? = nil,
        width: CGFloat? = nil,
        height: CGFloat? = nil,
        zIndex: Int? = nil,
        image: String? = nil,
        rotation: CGFloat? = nil,
        flat: Bool? = nil,
        alpha: CGFloat? = nil,
        pinColor: UIColor? = nil
    ) {
        self.coordinate = coordinate
        self.width = width
        self.height = height
        self.zIndex = zIndex
        self.image = image
        self.rotation = rotation
        self.flat = flat
        self.alpha = alpha
        self.pinColor = pinColor
    }

    init(object: [String: Any]) {
        if let coordinate = object["coordinate"] as? [String: Double],
           let lat = coordinate["latitude"],
           let lng = coordinate["longitude"] {
            self.coordinate = NMGLatLng(lat: lat, lng: lng)
        } else {
            self.coordinate = nil
        }

        self.width = object["width"] as? CGFloat
        self.height = object["height"] as? CGFloat
        self.zIndex = object["zIndex"] as? Int
        self.image = object["image"] as? String
        self.rotation = object["rotation"] as? CGFloat
        self.flat = object["flat"] as? Bool
        self.alpha = object["alpha"] as? CGFloat

        if let pinColor = object["pinColor"] as? Int {
            self.pinColor = RCTConvert.uiColor(pinColor)
        } else {
            self.pinColor = nil
        }
    }
}
