//
//  NMFMarker+Extension.swift
//  react-native-toss-naver-map
//

import Foundation
import NMapsMap

extension NMFMarker {

    func loadImage(from urlString: String) {
        guard let url = URL(string: urlString) else { return }

        URLSession.shared.dataTask(with: url) { [weak self] data, _, error in
            guard let data = data,
                  error == nil,
                  let image = UIImage(data: data) else {
                return
            }

            DispatchQueue.main.async {
                let overlayImage = NMFOverlayImage(image: image)
                self?.iconImage = overlayImage
            }
        }.resume()
    }

    func applyMarkerData(_ markerData: GraniteNaverMapMarkerData) {
        if let coordinate = markerData.coordinate {
            self.position = coordinate
        }

        if let width = markerData.width {
            self.width = width
        }

        if let height = markerData.height {
            self.height = height
        }

        if let zIndex = markerData.zIndex {
            self.zIndex = zIndex
        }

        if let imageURL = markerData.image {
            loadImage(from: imageURL)
        }

        if let rotation = markerData.rotation {
            self.angle = rotation
        }

        if let flat = markerData.flat {
            self.isFlat = flat
        }

        if let alpha = markerData.alpha {
            self.alpha = alpha
        }

        if let pinColor = markerData.pinColor {
            self.iconTintColor = pinColor
        }
    }
}
