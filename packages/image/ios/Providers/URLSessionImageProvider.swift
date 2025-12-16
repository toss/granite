#if GRANITE_PROVIDER_URLSESSION || (!GRANITE_PROVIDER_KINGFISHER && !GRANITE_PROVIDER_SDWEBIMAGE)

import UIKit

/// Image provider implementation using URLSession (no external dependencies).
@objc public class URLSessionImageProvider: NSObject, GraniteImageProvidable {

    private let session: URLSession
    private let activeTasks = NSMapTable<UIView, URLSessionDataTask>.weakToStrongObjects()
    private let taskData = NSMapTable<URLSessionDataTask, NSMutableData>.strongToStrongObjects()
    private let progressBlocks = NSMapTable<URLSessionDataTask, AnyObject>.strongToStrongObjects()
    private let completionBlocks = NSMapTable<URLSessionDataTask, AnyObject>.strongToStrongObjects()
    private let taskImageViews = NSMapTable<URLSessionDataTask, UIImageView>.strongToWeakObjects()
    private let expectedLengths = NSMapTable<URLSessionDataTask, NSNumber>.strongToStrongObjects()
    private let lockQueue = DispatchQueue(label: "com.graniteimage.urlsession.lock")

    public override init() {
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = .returnCacheDataElseLoad
        session = URLSession(configuration: config)
        super.init()
    }

    /// Auto-register as default provider
    @objc public static func autoRegister() {
        let provider = URLSessionImageProvider()
        GraniteImageRegistry.shared.register(provider: provider)
        NSLog("[URLSessionImageProvider] Auto-registered as default provider")
    }

    // MARK: - GraniteImageProvidable

    @objc public func createImageView() -> UIView {
        let imageView = UIImageView()
        imageView.backgroundColor = .lightGray
        return imageView
    }

    @objc public func loadImage(withURL url: String, into view: UIView, contentMode: UIView.ContentMode) {
        loadImage(
            withURL: url,
            into: view,
            contentMode: contentMode,
            headers: nil,
            priority: .normal,
            cachePolicy: .disk,
            defaultSource: nil,
            progress: nil,
            completion: nil
        )
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
                NSLog("[URLSessionImageProvider] View is not UIImageView")
                completionBlock?(nil, NSError(domain: "GraniteImageProvidable", code: -3, userInfo: [NSLocalizedDescriptionKey: "View is not UIImageView"]), .zero)
                return
            }
            imageView = iv
            imageView?.contentMode = contentMode

            // Show placeholder if provided
            if let defaultSource = defaultSource, !defaultSource.isEmpty {
                imageView?.image = UIImage(named: defaultSource)
            }
        }

        guard let imageURL = URL(string: url) else {
            NSLog("[URLSessionImageProvider] Invalid URL: \(url)")
            completionBlock?(nil, NSError(domain: "GraniteImageProvidable", code: -4, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]), .zero)
            return
        }

        // Cancel any existing task for this view (only if view exists)
        if let view = view {
            cancelLoad(with: view)
        }

        // Create request with headers
        var request = URLRequest(url: imageURL)

        // Apply headers
        headers?.forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }

        // Apply cache policy
        switch cachePolicy {
        case .memory, .disk:
            request.cachePolicy = .returnCacheDataElseLoad
        case .none:
            request.cachePolicy = .reloadIgnoringLocalCacheData
        }

        // Apply priority
        switch priority {
        case .low:
            request.networkServiceType = .background
        case .normal:
            request.networkServiceType = .default
        case .high:
            request.networkServiceType = .responsiveData
        }

        let task = session.dataTask(with: request) { [weak self, weak imageView] data, response, error in
            guard let self = self else { return }

            if let error = error {
                NSLog("[URLSessionImageProvider] Error loading image: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    completionBlock?(nil, error, .zero)
                }
                return
            }

            guard let data = data else {
                let noDataError = NSError(domain: "GraniteImageProvidable", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])
                DispatchQueue.main.async {
                    completionBlock?(nil, noDataError, .zero)
                }
                return
            }

            guard let image = UIImage(data: data) else {
                let decodeError = NSError(domain: "GraniteImageProvidable", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to decode image data"])
                DispatchQueue.main.async {
                    completionBlock?(nil, decodeError, .zero)
                }
                return
            }

            let imageSize = image.size

            DispatchQueue.main.async {
                imageView?.image = image
                NSLog("[URLSessionImageProvider] Loaded with URLSession: \(url)")
                completionBlock?(image, nil, imageSize)
            }
        }

        if let view = view {
            lockQueue.sync {
                activeTasks.setObject(task, forKey: view)
            }
        }
        task.resume()
    }

    @objc public func cancelLoad(with view: UIView) {
        lockQueue.sync {
            if let task = activeTasks.object(forKey: view) {
                task.cancel()
                activeTasks.removeObject(forKey: view)
            }
        }
    }

    @objc public func applyTintColor(_ tintColor: UIColor, to view: UIView) {
        guard let imageView = view as? UIImageView else { return }
        imageView.tintColor = tintColor
        if let image = imageView.image {
            imageView.image = image.withRenderingMode(.alwaysTemplate)
        }
    }
}

#endif
