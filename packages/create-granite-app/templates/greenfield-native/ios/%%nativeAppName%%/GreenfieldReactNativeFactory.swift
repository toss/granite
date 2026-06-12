import UIKit
import React
import React_RCTAppDelegate

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
    GreenfieldBundleLoader.bundleURL()
  }
}
