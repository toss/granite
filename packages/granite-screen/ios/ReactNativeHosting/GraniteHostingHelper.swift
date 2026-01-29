//
//  GraniteHostingHelper.swift
//  GraniteScreen
//
//  Helper extension for setting up React Native hosting with GraniteNativeFactory
//

import React
import ReactAppDependencyProvider
import UIKit

struct GraniteHostItem {
    var hostURL: URL
    var moduleName: String
}

public enum GraniteReactHostError: Error {
    case bundleLoadError
    case graniteItemConvertError
    case rnHostViewFactoryError
    case bundleURLParsingError
}

private var ReactNativeHostAssociatedKey: UInt8 = 0
private var ReactNativeDelegateAssociatedKey: UInt8 = 0
// MARK: - Setup Extension for GraniteReactHost
/// Extension for classes implementing GraniteReactHost
/// Provides one-line setup matching Android's pattern
public extension GraniteReactHost where Self: UIViewController {

 /// Setup React Native host with automatic lifecycle management
    /// Call this in viewDidLoad() for one-line initialization like Android
    @MainActor
    func setupHost(bundleLoader: BundleLoadable,
                   initialProperties: [AnyHashable: Any],
                   launchOptions: [AnyHashable: Any]) async {
        graniteSetupDidStart()
        do {
            let bundle = try await bundleLoader.loadBundle()
            do {
                let item = try await convertToGraniteItem(bundleSource: bundle)
                let delegate = ReactNativeFactoryDelegate(url: item.hostURL)
                delegate.dependencyProvider = RCTAppDependencyProvider()
                // Use GraniteNativeFactoryWrapper to enable module customization
                let factory = GraniteNativeFactoryImpl(delegate: delegate)
                factory.reactHost = self  // self is GraniteReactHost
                let rnHostView = factory.view(withModuleName: item.moduleName,
                                              initialProperties: initialProperties,
                                              launchOptions: launchOptions)
                // 진성님 돌아오고나면 의견나눠보기 objC 기반으로 메모리 등록해서 사용하는방법
                objc_setAssociatedObject(self, &ReactNativeHostAssociatedKey, factory, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
                objc_setAssociatedObject(self, &ReactNativeDelegateAssociatedKey, delegate, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
                if let rnHostView {
                    setGraniteBaseView(graniteBaseView: rnHostView)
                    graniteSetupDidFinish()
                } else {
                    graniteSetupDidError(didFailWith: GraniteReactHostError.rnHostViewFactoryError)
                }
            } catch {
                graniteSetupDidError(didFailWith: GraniteReactHostError.graniteItemConvertError)
            }
        } catch {
            graniteSetupDidError(didFailWith: GraniteReactHostError.bundleLoadError)
        }
    }

    private func setGraniteBaseView(graniteBaseView: UIView) {
        self.graniteBaseView = graniteBaseView
        view.addSubview(graniteBaseView)
        graniteBaseView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            graniteBaseView.topAnchor.constraint(equalTo: view.topAnchor),
            graniteBaseView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            graniteBaseView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            graniteBaseView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func convertToGraniteItem(bundleSource: BundleSource) async throws -> GraniteHostItem {
        switch bundleSource {
        case .devServer(let host, let port, let moduleName, let forBundleRoot):
            if let url = URL(string: "http://\(host):\(port)/\(forBundleRoot).bundle?platform=ios&dev=true&minify=false") {
                return .init(hostURL: url, moduleName: moduleName)
            } else {
                let url = URL(string: "http://\(host):\(port)/\(forBundleRoot).bundle?platform=ios&dev=true&minify=false")
                return .init(hostURL: url!, moduleName: moduleName)
            }
        case .production(let location, let moduleName):
            switch location {
            case .fileSystemBundle(let filePath):
                return .init(hostURL: filePath, moduleName: moduleName)
            case .embeddedBundle:
                if let url = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
                    return .init(hostURL: url, moduleName: moduleName)
                } else {
                    throw GraniteReactHostError.bundleURLParsingError
                }
            }
        case .customPath(let url, let moduleName):
            return .init(hostURL: url, moduleName: moduleName)
        }
    }
}
