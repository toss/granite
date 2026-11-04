import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    let window = UIWindow(frame: UIScreen.main.bounds)
    window.rootViewController = UINavigationController(rootViewController: ComponentViewDemoViewController())
    window.makeKeyAndVisible()
    self.window = window

    // Renders the components of every RNComponentView into the Portal hosts inside those views. The root itself shows
    // nothing, so it stays behind the native screens and leaves touches to them.
    let rendererRootView = factory.rootViewFactory.view(
      withModuleName: "RendererHost",
      initialProperties: nil,
      launchOptions: launchOptions
    )
    rendererRootView.frame = window.bounds
    rendererRootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    rendererRootView.isUserInteractionEnabled = false
    rendererRootView.accessibilityElementsHidden = true
    window.insertSubview(rendererRootView, at: 0)

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
