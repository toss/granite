#if GRANITE_PROVIDER_KINGFISHER

import UIKit
import Kingfisher

@objc public class KingfisherImageProvider: NSObject, GraniteImageProvidable {

    @objc public func createImageView() -> UIView {
        let imageView = UIImageView()
        imageView.backgroundColor = .lightGray
        return imageView
    }

    @objc public func loadImage(withURL url: String, into view: UIView, contentMode: UIView.ContentMode) {
        guard let imageView = view as? UIImageView else {
            NSLog("[KingfisherImageProvider] View is not UIImageView")
            return
        }

        imageView.contentMode = contentMode

        guard let imageURL = URL(string: url) else {
            NSLog("[KingfisherImageProvider] Invalid URL: \(url)")
            return
        }

        imageView.kf.setImage(
            with: imageURL,
            placeholder: nil,
            options: [.retryStrategy(DelayRetryStrategy(maxRetryCount: 2))]
        ) { result in
            switch result {
            case .success(let value):
                let cacheType: String
                switch value.cacheType {
                case .none: cacheType = "Network"
                case .memory: cacheType = "Memory"
                case .disk: cacheType = "Disk"
                }
                NSLog("[KingfisherImageProvider] Loaded with Kingfisher (\(cacheType)): \(url)")
            case .failure(let error):
                NSLog("[KingfisherImageProvider] Error loading image: \(error.localizedDescription)")
            }
        }
    }

    @objc public func cancelLoad(with view: UIView) {
        guard let imageView = view as? UIImageView else { return }
        imageView.kf.cancelDownloadTask()
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
                NSLog("[KingfisherImageProvider] View is not UIImageView")
                completionBlock?(nil, NSError(domain: "KingfisherImageProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "View is not UIImageView"]), .zero)
                return
            }
            imageView = iv
            imageView?.contentMode = contentMode
        }

        guard let imageURL = URL(string: url) else {
            NSLog("[KingfisherImageProvider] Invalid URL: \(url)")
            completionBlock?(nil, NSError(domain: "KingfisherImageProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]), .zero)
            return
        }

        // Load placeholder image if provided
        var placeholderImage: UIImage? = nil
        if let defaultSource = defaultSource, !defaultSource.isEmpty {
            placeholderImage = UIImage(named: defaultSource)
        }

        // Build options
        var options: KingfisherOptionsInfo = [.retryStrategy(DelayRetryStrategy(maxRetryCount: 2))]

        // Apply priority
        switch priority {
        case .low:
            options.append(.downloadPriority(0.3))
        case .high:
            options.append(.downloadPriority(1.0))
        case .normal:
            options.append(.downloadPriority(0.5))
        }

        // Apply cache policy
        switch cachePolicy {
        case .memory:
            options.append(.cacheMemoryOnly)
        case .none:
            options.append(.forceRefresh)
        case .disk:
            break
        }

        // Apply headers if provided
        if let headers = headers, !headers.isEmpty {
            let modifier = AnyModifier { request in
                var request = request
                for (key, value) in headers {
                    request.setValue(value, forHTTPHeaderField: key)
                }
                return request
            }
            options.append(.requestModifier(modifier))
        }

        if let imageView = imageView {
            imageView.kf.setImage(
                with: imageURL,
                placeholder: placeholderImage,
                options: options,
                progressBlock: { receivedSize, totalSize in
                    progressBlock?(Int64(receivedSize), Int64(totalSize))
                }
            ) { result in
                switch result {
                case .success(let value):
                    let cacheType: String
                    switch value.cacheType {
                    case .none: cacheType = "Network"
                    case .memory: cacheType = "Memory"
                    case .disk: cacheType = "Disk"
                    }
                    NSLog("[KingfisherImageProvider] Loaded with Kingfisher (\(cacheType)): \(url)")
                    completionBlock?(value.image, nil, value.image.size)
                case .failure(let error):
                    NSLog("[KingfisherImageProvider] Error loading image: \(error.localizedDescription)")
                    completionBlock?(nil, error as NSError, .zero)
                }
            }
        } else {
            // Preload without view
            KingfisherManager.shared.retrieveImage(
                with: imageURL,
                options: options,
                progressBlock: { receivedSize, totalSize in
                    progressBlock?(Int64(receivedSize), Int64(totalSize))
                }
            ) { result in
                switch result {
                case .success(let value):
                    let cacheType: String
                    switch value.cacheType {
                    case .none: cacheType = "Network"
                    case .memory: cacheType = "Memory"
                    case .disk: cacheType = "Disk"
                    }
                    NSLog("[KingfisherImageProvider] Preloaded with Kingfisher (\(cacheType)): \(url)")
                    completionBlock?(value.image, nil, value.image.size)
                case .failure(let error):
                    NSLog("[KingfisherImageProvider] Error preloading image: \(error.localizedDescription)")
                    completionBlock?(nil, error as NSError, .zero)
                }
            }
        }
    }

    @objc public func applyTintColor(_ tintColor: UIColor, to view: UIView) {
        guard let imageView = view as? UIImageView else { return }
        imageView.image = imageView.image?.withRenderingMode(.alwaysTemplate)
        imageView.tintColor = tintColor
    }
}

#endif
