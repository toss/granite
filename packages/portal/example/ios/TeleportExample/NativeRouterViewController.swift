import UIKit

final class NativeRouterViewController: UIViewController {
  private enum Page: Equatable {
    case main
    case store
    case wallet
  }

  private enum TransitionDirection {
    case present
    case dismiss
  }

  private let appDelegate: AppDelegate
  private var history: [Page] = [.main]
  private var currentPage: Page = .main
  private var isTransitioning = false

  private lazy var mainViewController = MainViewController(
    isControllerReady: appDelegate.isControllerReady
  ) { [weak self] hostName in
    self?.showPortal(hostName: hostName)
  }
  private lazy var storeViewController = PortalHostViewController(
    hostName: storeHostName
  )
  private lazy var walletViewController = PortalHostViewController(
    hostName: walletHostName
  )

  init(appDelegate: AppDelegate) {
    self.appDelegate = appDelegate
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    nil
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    edgesForExtendedLayout = []

    [
      mainViewController,
      storeViewController,
      walletViewController,
    ].forEach(attach)
    showImmediately(page: .main)

    appDelegate.whenControllerReady { [weak mainViewController] in
      mainViewController?.setControllerReady(true)
    }
  }

  func showPortal(hostName: String) {
    switch hostName {
    case storeHostName:
      push(page: .store)
    case walletHostName:
      push(page: .wallet)
    default:
      return
    }
  }

  func showMain() {
    push(page: .main)
  }

  private func attach(_ viewController: UIViewController) {
    addChild(viewController)
    viewController.view.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(viewController.view)
    NSLayoutConstraint.activate([
      viewController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      viewController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      viewController.view.topAnchor.constraint(equalTo: view.topAnchor),
      viewController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
    viewController.didMove(toParent: self)
  }

  private func push(page: Page) {
    loadViewIfNeeded()
    guard !isTransitioning, page != currentPage else {
      return
    }

    history.append(page)
    transition(to: page, direction: .present)
  }

  private var pages: [(Page, UIViewController)] {
    [
      (Page.main, mainViewController),
      (Page.store, storeViewController),
      (Page.wallet, walletViewController),
    ]
  }

  private func showImmediately(page: Page) {
    for (candidate, viewController) in pages {
      viewController.view.isHidden = candidate != page
    }

    guard let activeViewController = viewController(for: page) else {
      return
    }

    currentPage = page
    view.bringSubviewToFront(activeViewController.view)
    updateNavigationItem(for: page)
  }

  private func transition(
    to page: Page,
    direction: TransitionDirection
  ) {
    guard
      let fromView = viewController(for: currentPage)?.view,
      let toView = viewController(for: page)?.view
    else {
      return
    }

    isTransitioning = true
    toView.isHidden = false
    let travelDistance = max(view.bounds.height, UIScreen.main.bounds.height)

    switch direction {
    case .present:
      toView.transform = CGAffineTransform(translationX: 0, y: travelDistance)
      view.bringSubviewToFront(toView)
    case .dismiss:
      toView.transform = .identity
      view.insertSubview(toView, belowSubview: fromView)
    }

    updateNavigationItem(for: page)
    UIView.animate(
      withDuration: 0.35,
      delay: 0,
      options: [.curveEaseInOut, .beginFromCurrentState]
    ) {
      switch direction {
      case .present:
        toView.transform = .identity
      case .dismiss:
        fromView.transform = CGAffineTransform(
          translationX: 0,
          y: travelDistance
        )
      }
    } completion: { [weak self] _ in
      fromView.isHidden = true
      fromView.transform = .identity
      toView.transform = .identity
      self?.view.bringSubviewToFront(toView)
      self?.currentPage = page
      self?.isTransitioning = false
    }
  }

  private func updateNavigationItem(for page: Page) {
    title = page == .main ? "Native Main" : nil
    navigationItem.leftBarButtonItem = history.count > 1
      ? UIBarButtonItem(
        image: UIImage(systemName: "chevron.left"),
        style: .plain,
        target: self,
        action: #selector(goBack)
      )
      : nil
    navigationItem.leftBarButtonItem?.accessibilityLabel = "Back"
  }

  private func viewController(for page: Page) -> UIViewController? {
    pages.first { $0.0 == page }?.1
  }

  @objc
  private func goBack() {
    guard !isTransitioning, history.count > 1 else {
      return
    }

    history.removeLast()
    if let page = history.last {
      transition(to: page, direction: .dismiss)
    }
  }
}
