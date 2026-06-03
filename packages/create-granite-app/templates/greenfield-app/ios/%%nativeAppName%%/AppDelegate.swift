import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
#if canImport(GraniteVideo)
import GraniteVideo
#endif

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    window = UIWindow(frame: UIScreen.main.bounds)
    window?.rootViewController = GreenfieldViewController(
      launchOptions: launchOptions ?? [:]
    )
    window?.makeKeyAndVisible()

    return true
  }
}

final class GreenfieldViewController: UIViewController {
  private let launchOptions: [UIApplication.LaunchOptionsKey: Any]
  private var reactNativeDelegate: ReactNativeDelegate?
  private var reactNativeFactory: GreenfieldReactNativeFactory?

  init(launchOptions: [UIApplication.LaunchOptionsKey: Any]) {
    self.launchOptions = launchOptions
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    registerNativeProviders()
    startReactNative()
  }

  private func registerNativeProviders() {
    #if canImport(GraniteVideo)
    GraniteVideoRegistry.shared.register(provider: AVPlayerProvider())
    #endif
  }

  private func startReactNative() {
    let delegate = ReactNativeDelegate()
    let factory = GreenfieldReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    guard let rootView = factory.view(
      withModuleName: "shared",
      initialProperties: [:],
      launchOptions: launchOptions
    ) else {
      return
    }

    view.addSubview(rootView)
    rootView.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      rootView.topAnchor.constraint(equalTo: view.topAnchor),
      rootView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      rootView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      rootView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
    ])
  }
}

final class GreenfieldReactNativeFactory: RCTReactNativeFactory {
  func view(
    withModuleName moduleName: String,
    initialProperties: [AnyHashable: Any],
    launchOptions: [UIApplication.LaunchOptionsKey: Any]
  ) -> UIView? {
    rootViewFactory.view(
      withModuleName: moduleName,
      initialProperties: initialProperties,
      launchOptions: launchOptions
    )
  }
}

final class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
