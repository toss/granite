import UIKit
import BrickModule
import GraniteBrownfield
import ReactAppDependencyProvider
#if canImport(GraniteVideo)
import GraniteVideo
#endif

final class GreenfieldViewController: UIViewController, BrickModuleRegistrableViewController, BrickModuleRegistrable {
  let moduleRegistry = BrickModuleRegistry()

  private let launchOptions: [UIApplication.LaunchOptionsKey: Any]
  private let launchSchemeUri: String
  private var reactNativeDelegate: ReactNativeDelegate?
  private var reactNativeFactory: GreenfieldReactNativeFactory?

  init(launchOptions: [UIApplication.LaunchOptionsKey: Any]) {
    self.launchOptions = launchOptions
    if let url = launchOptions[.url] as? URL {
      self.launchSchemeUri = url.absoluteString
    } else {
      self.launchSchemeUri = ""
    }
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    registerNativeProviders()
    registerModules()
    startReactNative()
  }

  func registerModules() {
    moduleRegistry.register([
      GraniteBrownfieldModule(
        viewController: self,
        schemeUriProvider: { [weak self] in self?.launchSchemeUri ?? "" }
      )
    ])
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
