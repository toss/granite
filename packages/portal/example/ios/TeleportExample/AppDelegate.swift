import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  private var launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  private var controllerRootView: UIView?
  private var contentObserver: NSObjectProtocol?
  private var readyHandlers: [() -> Void] = []
  private(set) var isControllerReady = false

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    self.launchOptions = launchOptions

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role
    )
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }

  func startReactNative(in window: UIWindow) {
    guard controllerRootView == nil, let reactNativeFactory else {
      return
    }

    contentObserver = NotificationCenter.default.addObserver(
      forName: NSNotification.Name.RCTContentDidAppear,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.markControllerReady()
    }

    let rootView = reactNativeFactory.rootViewFactory.view(
      withModuleName: "TeleportController",
      initialProperties: nil,
      launchOptions: launchOptions
    )
    rootView.frame = window.bounds
    rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    rootView.isUserInteractionEnabled = false
    rootView.accessibilityElementsHidden = true

    window.insertSubview(rootView, at: 0)
    window.layoutIfNeeded()
    controllerRootView = rootView
  }

  func whenControllerReady(_ handler: @escaping () -> Void) {
    if isControllerReady {
      handler()
    } else {
      readyHandlers.append(handler)
    }
  }

  private func markControllerReady() {
    guard !isControllerReady else {
      return
    }

    isControllerReady = true
    if let contentObserver {
      NotificationCenter.default.removeObserver(contentObserver)
      self.contentObserver = nil
    }
    let handlers = readyHandlers
    readyHandlers.removeAll()
    handlers.forEach { $0() }
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
