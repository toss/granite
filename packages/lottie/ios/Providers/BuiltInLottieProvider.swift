import Foundation
import UIKit
import Lottie

/// Built-in Lottie provider using Airbnb's lottie-ios SDK
/// This provider renders Lottie animations natively using the official SDK
@objc public class BuiltInLottieProvider: NSObject, GraniteLottieProvidable {
    private var delegates: NSMapTable<UIView, AnyObject> = NSMapTable.weakToWeakObjects()
    private var animationViews: NSMapTable<UIView, LottieAnimationView> = NSMapTable.weakToStrongObjects()
    private var loadingTasks: NSMapTable<UIView, URLSessionDataTask> = NSMapTable.weakToStrongObjects()

    @objc public override init() {
        super.init()
    }

    @objc public func createAnimationView() -> UIView {
        let container = UIView()
        container.backgroundColor = .clear

        let lottieView = LottieAnimationView()
        lottieView.translatesAutoresizingMaskIntoConstraints = false
        lottieView.backgroundBehavior = .pauseAndRestore
        container.addSubview(lottieView)

        NSLayoutConstraint.activate([
            lottieView.topAnchor.constraint(equalTo: container.topAnchor),
            lottieView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            lottieView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            lottieView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        animationViews.setObject(lottieView, forKey: container)
        return container
    }

    @objc public func loadAnimation(named name: String, into view: UIView, config: GraniteLottieLoadConfig) {
        guard let lottieView = animationViews.object(forKey: view) else { return }

        // Cancel any existing load
        cancelLoad(view: view)

        // Try to load from bundle
        if let animation = LottieAnimation.named(name) {
            lottieView.animation = animation
            applyConfig(config, to: lottieView)
            notifyLoaded(for: view)

            if config.autoPlay {
                playAnimation(lottieView, view: view)
            }
        } else {
            notifyFailure(for: view, error: "Asset not found: \(name)")
        }
    }

    @objc public func loadAnimation(json: String, into view: UIView, config: GraniteLottieLoadConfig) {
        guard let lottieView = animationViews.object(forKey: view) else { return }

        // Cancel any existing load
        cancelLoad(view: view)

        if let data = json.data(using: .utf8) {
            do {
                let animation = try LottieAnimation.from(data: data)
                lottieView.animation = animation
                applyConfig(config, to: lottieView)
                notifyLoaded(for: view)

                if config.autoPlay {
                    playAnimation(lottieView, view: view)
                }
            } catch {
                notifyFailure(for: view, error: error.localizedDescription)
            }
        } else {
            notifyFailure(for: view, error: "Failed to parse JSON string")
        }
    }

    @objc public func loadAnimation(url: URL, into view: UIView, config: GraniteLottieLoadConfig) {
        guard let lottieView = animationViews.object(forKey: view) else { return }

        // Cancel any existing load
        cancelLoad(view: view)

        let cacheKey = config.cacheComposition ? url.absoluteString : nil

        LottieAnimation.loadedFrom(url: url, closure: { [weak self, weak lottieView, weak view] animation in
            DispatchQueue.main.async {
                guard let self = self, let lottieView = lottieView, let view = view else { return }

                if let animation = animation {
                    lottieView.animation = animation
                    self.applyConfig(config, to: lottieView)
                    self.notifyLoaded(for: view)

                    if config.autoPlay {
                        self.playAnimation(lottieView, view: view)
                    }
                } else {
                    self.notifyFailure(for: view, error: "Failed to load animation from URL")
                }
            }
        }, animationCache: cacheKey != nil ? LottieAnimationCache.shared : nil)
    }

    @objc public func loadDotLottie(uri: String, into view: UIView, config: GraniteLottieLoadConfig) {
        guard let lottieView = animationViews.object(forKey: view) else { return }

        // Cancel any existing load
        cancelLoad(view: view)

        if let url = URL(string: uri) {
            DotLottieFile.loadedFrom(url: url) { [weak self, weak lottieView, weak view] result in
                DispatchQueue.main.async {
                    guard let self = self, let lottieView = lottieView, let view = view else { return }

                    switch result {
                    case .success(let dotLottie):
                        lottieView.loadAnimation(from: dotLottie)
                        self.applyConfig(config, to: lottieView)
                        self.notifyLoaded(for: view)

                        if config.autoPlay {
                            self.playAnimation(lottieView, view: view)
                        }
                    case .failure(let error):
                        self.notifyFailure(for: view, error: error.localizedDescription)
                    }
                }
            }
        } else {
            notifyFailure(for: view, error: "Invalid .lottie URI: \(uri)")
        }
    }

    @objc public func setDelegate(_ delegate: GraniteLottieDelegate?, for view: UIView) {
        if let delegate = delegate {
            delegates.setObject(delegate as AnyObject, forKey: view)
        } else {
            delegates.removeObject(forKey: view)
        }
    }

    @objc public func play(view: UIView, startFrame: Int, endFrame: Int) {
        guard let lottieView = animationViews.object(forKey: view) else { return }

        if startFrame >= 0 && endFrame > startFrame {
            lottieView.play(fromFrame: AnimationFrameTime(startFrame),
                           toFrame: AnimationFrameTime(endFrame),
                           loopMode: lottieView.loopMode) { [weak self, weak view] finished in
                guard let self = self, let view = view else { return }
                // Only notify finish when not looping or when explicitly cancelled
                if lottieView.loopMode != .loop || !finished {
                    if let delegate = self.delegates.object(forKey: view) as? GraniteLottieDelegate {
                        delegate.animationDidFinish?(isCancelled: !finished)
                    }
                }
            }
        } else {
            // Play from beginning when no specific frames are provided
            lottieView.currentProgress = 0
            lottieView.play { [weak self, weak view] finished in
                guard let self = self, let view = view, let lottieView = self.animationViews.object(forKey: view) else { return }
                // Only notify finish when not looping or when explicitly cancelled
                if lottieView.loopMode != .loop || !finished {
                    if let delegate = self.delegates.object(forKey: view) as? GraniteLottieDelegate {
                        delegate.animationDidFinish?(isCancelled: !finished)
                    }
                }
            }
        }
    }

    @objc public func pause(view: UIView) {
        guard let lottieView = animationViews.object(forKey: view) else { return }
        lottieView.pause()
    }

    @objc public func resume(view: UIView) {
        guard let lottieView = animationViews.object(forKey: view) else { return }
        lottieView.play()
    }

    @objc public func reset(view: UIView) {
        guard let lottieView = animationViews.object(forKey: view) else { return }
        lottieView.stop()
        lottieView.currentProgress = 0
    }

    @objc public func setProgress(_ progress: Float, for view: UIView) {
        guard let lottieView = animationViews.object(forKey: view) else { return }
        lottieView.currentProgress = AnimationProgressTime(progress)
    }

    @objc public func setSpeed(_ speed: Double, for view: UIView) {
        guard let lottieView = animationViews.object(forKey: view) else { return }
        lottieView.animationSpeed = CGFloat(speed)
    }

    @objc public func setLoop(_ loop: Bool, for view: UIView) {
        guard let lottieView = animationViews.object(forKey: view) else { return }
        lottieView.loopMode = loop ? .loop : .playOnce
    }

    @objc public func applyColorFilters(_ filters: [GraniteLottieColorFilter], to view: UIView) {
        guard let lottieView = animationViews.object(forKey: view) else { return }

        for filter in filters {
            let keypath = filter.keypath == "*" ? "**" : filter.keypath
            let colorValueProvider = ColorValueProvider(filter.color.lottieColorValue)
            lottieView.setValueProvider(colorValueProvider, keypath: AnimationKeypath(keypath: "\(keypath).Color"))
        }
    }

    @objc public func applyTextFilters(_ filters: [GraniteLottieTextFilter], to view: UIView) {
        guard let lottieView = animationViews.object(forKey: view) else { return }

        let textProvider = GraniteLottieTextProvider(filters: filters)
        lottieView.textProvider = textProvider
    }

    @objc public func cancelLoad(view: UIView) {
        if let task = loadingTasks.object(forKey: view) {
            task.cancel()
            loadingTasks.removeObject(forKey: view)
        }
    }

    // MARK: - Private Helpers

    private func applyConfig(_ config: GraniteLottieLoadConfig, to lottieView: LottieAnimationView) {
        lottieView.animationSpeed = CGFloat(config.speed)
        lottieView.loopMode = config.loop ? .loop : .playOnce
        lottieView.currentProgress = AnimationProgressTime(config.progress)

        switch config.resizeMode {
        case .cover:
            lottieView.contentMode = .scaleAspectFill
        case .contain:
            lottieView.contentMode = .scaleAspectFit
        case .center:
            lottieView.contentMode = .center
        @unknown default:
            lottieView.contentMode = .scaleAspectFit
        }
    }

    private func playAnimation(_ lottieView: LottieAnimationView, view: UIView) {
        // Play with explicit loopMode to ensure it's respected
        lottieView.play(fromProgress: 0, toProgress: 1, loopMode: lottieView.loopMode) { [weak self, weak view, weak lottieView] finished in
            guard let view = view, let lottieView = lottieView else { return }
            // Only notify finish when not looping or when explicitly cancelled
            if lottieView.loopMode != .loop || !finished {
                if let delegate = self?.delegates.object(forKey: view) as? GraniteLottieDelegate {
                    delegate.animationDidFinish?(isCancelled: !finished)
                }
            }
        }
    }

    private func notifyLoaded(for view: UIView) {
        DispatchQueue.main.async { [weak self] in
            if let delegate = self?.delegates.object(forKey: view) as? GraniteLottieDelegate {
                delegate.animationDidLoad?()
            }
        }
    }

    private func notifyFailure(for view: UIView, error: String) {
        DispatchQueue.main.async { [weak self] in
            if let delegate = self?.delegates.object(forKey: view) as? GraniteLottieDelegate {
                delegate.animationDidFail?(error: error)
            }
        }
    }
}

// MARK: - UIColor Extension for Lottie

extension UIColor {
    var lottieColorValue: LottieColor {
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        self.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        return LottieColor(r: Double(red), g: Double(green), b: Double(blue), a: Double(alpha))
    }
}

// MARK: - Custom Text Provider

private class GraniteLottieTextProvider: AnimationKeypathTextProvider {
    private let filters: [GraniteLottieTextFilter]

    init(filters: [GraniteLottieTextFilter]) {
        self.filters = filters
    }

    func text(for keypath: AnimationKeypath, sourceText: String) -> String? {
        // AnimationKeypath.fullPath is internal, use keys property instead
        let keypathString = keypath.keys.joined(separator: ".")
        for filter in filters {
            if filter.keypath == "*" || keypathString.contains(filter.keypath) {
                return filter.text
            }
        }
        return nil
    }
}
