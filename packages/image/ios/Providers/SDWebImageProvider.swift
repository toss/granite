#if GRANITE_IMAGE_DEFAULT_PROVIDER

import UIKit
import SDWebImage

@objc public class SDWebImageProvider: NSObject, GraniteImageProvidable {

    @objc public func createImageView() -> UIView {
        let imageView = UIImageView()
        imageView.backgroundColor = .lightGray
        return imageView
    }

    @objc public func loadImage(withURL url: String, into view: UIView, contentMode: UIView.ContentMode) {
        guard let imageView = view as? UIImageView else {
            NSLog("[SDWebImageProvider] View is not UIImageView")
            return
        }

        imageView.contentMode = contentMode

        guard let imageURL = URL(string: url) else {
            NSLog("[SDWebImageProvider] Invalid URL: \(url)")
            return
        }

        imageView.sd_setImage(
            with: imageURL,
            placeholderImage: nil,
            options: .retryFailed
        ) { _, error, cacheType, _ in
            if let error = error {
                NSLog("[SDWebImageProvider] Error loading image: \(error.localizedDescription)")
            } else {
                let cacheTypeStr: String
                switch cacheType {
                case .none: cacheTypeStr = "Network"
                case .disk: cacheTypeStr = "Disk"
                case .memory: cacheTypeStr = "Memory"
                default: cacheTypeStr = "Unknown"
                }
                NSLog("[SDWebImageProvider] Loaded with SDWebImage (\(cacheTypeStr)): \(url)")
            }
        }
    }

    @objc public func cancelLoad(with view: UIView) {
        guard let imageView = view as? UIImageView else { return }
        imageView.sd_cancelCurrentImageLoad()
    }

    @objc public func loadImage(
        withURL url: String,
        into view: UIView?,
        contentMode: UIView.ContentMode,
        headers: [String: String]?,
        priority: GraniteProviderPriority,
        cachePolicy: GraniteProviderCachePolicy,
        defaultSource: String?,
        progress progressBlock: GraniteImageProgressBlock?,
        completion completionBlock: GraniteImageCompletionBlock?
    ) {
        // Allow nil view for preloading
        var imageView: UIImageView? = nil
        if let view = view {
            guard let iv = view as? UIImageView else {
                NSLog("[SDWebImageProvider] View is not UIImageView")
                completionBlock?(nil, NSError(domain: "SDWebImageProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "View is not UIImageView"]), .zero)
                return
            }
            imageView = iv
            imageView?.contentMode = contentMode
        }

        guard let imageURL = URL(string: url) else {
            NSLog("[SDWebImageProvider] Invalid URL: \(url)")
            completionBlock?(nil, NSError(domain: "SDWebImageProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]), .zero)
            return
        }

        // Load placeholder image if provided
        var placeholderImage: UIImage? = nil
        if let defaultSource = defaultSource, !defaultSource.isEmpty {
            placeholderImage = UIImage(named: defaultSource)
        }

        // Build options
        var options: SDWebImageOptions = .retryFailed
        switch priority {
        case .low:
            options.insert(.lowPriority)
        case .high:
            options.insert(.highPriority)
        case .normal:
            break
        }

        // Build context with headers
        var context: [SDWebImageContextOption: Any]? = nil
        if let headers = headers, !headers.isEmpty {
            let modifier = SDWebImageDownloadRequestModifier { request in
                var mutableRequest = request
                for (key, value) in headers {
                    mutableRequest.setValue(value, forHTTPHeaderField: key)
                }
                return mutableRequest
            }
            context = [.downloadRequestModifier: modifier]
        }

        if let imageView = imageView {
            imageView.sd_setImage(
                with: imageURL,
                placeholderImage: placeholderImage,
                options: options,
                context: context,
                progress: { receivedSize, expectedSize, _ in
                    progressBlock?(Int64(receivedSize), Int64(expectedSize))
                },
                completed: { image, error, cacheType, _ in
                    if let error = error {
                        NSLog("[SDWebImageProvider] Error loading image: \(error.localizedDescription)")
                        completionBlock?(nil, error, .zero)
                    } else {
                        let cacheTypeStr: String
                        switch cacheType {
                        case .none: cacheTypeStr = "Network"
                        case .disk: cacheTypeStr = "Disk"
                        case .memory: cacheTypeStr = "Memory"
                        default: cacheTypeStr = "Unknown"
                        }
                        NSLog("[SDWebImageProvider] Loaded with SDWebImage (\(cacheTypeStr)): \(url)")
                        completionBlock?(image, nil, image?.size ?? .zero)
                    }
                }
            )
        } else {
            // Preload without view
            SDWebImageManager.shared.loadImage(
                with: imageURL,
                options: options,
                context: context,
                progress: { receivedSize, expectedSize, _ in
                    progressBlock?(Int64(receivedSize), Int64(expectedSize))
                },
                completed: { image, _, error, cacheType, _, _ in
                    if let error = error {
                        NSLog("[SDWebImageProvider] Error preloading image: \(error.localizedDescription)")
                        completionBlock?(nil, error, .zero)
                    } else {
                        let cacheTypeStr: String
                        switch cacheType {
                        case .none: cacheTypeStr = "Network"
                        case .disk: cacheTypeStr = "Disk"
                        case .memory: cacheTypeStr = "Memory"
                        default: cacheTypeStr = "Unknown"
                        }
                        NSLog("[SDWebImageProvider] Preloaded with SDWebImage (\(cacheTypeStr)): \(url)")
                        completionBlock?(image, nil, image?.size ?? .zero)
                    }
                }
            )
        }
    }

    @objc public func applyTintColor(_ tintColor: UIColor, to view: UIView) {
        guard let imageView = view as? UIImageView else { return }
        imageView.image = imageView.image?.withRenderingMode(.alwaysTemplate)
        imageView.tintColor = tintColor
    }
}

#endif
