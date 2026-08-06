import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  private var routerViewController: NativeRouterViewController?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    let routerViewController = NativeRouterViewController(
      appDelegate: appDelegate
    )
    let navigationController = UINavigationController(
      rootViewController: routerViewController
    )
    navigationController.navigationBar.prefersLargeTitles = false

    self.window = window
    self.routerViewController = routerViewController
    window.rootViewController = navigationController
    window.makeKeyAndVisible()

    appDelegate.startReactNative(in: window)

    connectionOptions.urlContexts.forEach { context in
      route(context.url)
    }
  }

  func scene(
    _ scene: UIScene,
    openURLContexts URLContexts: Set<UIOpenURLContext>
  ) {
    URLContexts.forEach { context in
      route(context.url)
    }
  }

  private func route(_ url: URL) {
    switch url.scheme {
    case "teleport-portal":
      guard let hostName = url.host, !hostName.isEmpty else {
        return
      }
      routerViewController?.showPortal(hostName: hostName)
    case "teleport-example":
      guard url.host == "cross-activity", url.path == "/main" else {
        return
      }
      routerViewController?.showMain()
    default:
      return
    }
  }
}
