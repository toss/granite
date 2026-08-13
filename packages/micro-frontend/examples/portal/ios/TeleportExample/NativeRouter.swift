import UIKit

let storeHostName = "cross-activity-primary"
let walletHostName = "cross-activity-secondary"

final class MainViewController: UIViewController {
  private let openHost: (String) -> Void
  private let storeButton = UIButton(type: .system)
  private let walletButton = UIButton(type: .system)
  private let preparingLabel = UILabel()
  private var isControllerReady: Bool

  init(
    isControllerReady: Bool,
    openHost: @escaping (String) -> Void
  ) {
    self.isControllerReady = isControllerReady
    self.openHost = openHost
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    nil
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = "Native Main"
    view.backgroundColor = UIColor(
      red: 245 / 255,
      green: 246 / 255,
      blue: 248 / 255,
      alpha: 1
    )

    let titleLabel = UILabel()
    titleLabel.font = .systemFont(ofSize: 28, weight: .bold)
    titleLabel.text = "Granite Portal"
    titleLabel.textAlignment = .center

    let descriptionLabel = UILabel()
    descriptionLabel.font = .systemFont(ofSize: 16)
    descriptionLabel.numberOfLines = 0
    descriptionLabel.text = "Open a React Native service in a UIViewController-owned portal host."
    descriptionLabel.textAlignment = .center
    descriptionLabel.textColor = .darkGray

    configureButton(
      storeButton,
      title: "Open Northstar Store RN",
      accessibilityIdentifier: "open_store_rn"
    ) { [weak self] in
      self?.openHost(storeHostName)
    }
    configureButton(
      walletButton,
      title: "Open Harbor Wallet RN",
      accessibilityIdentifier: "open_wallet_rn"
    ) { [weak self] in
      self?.openHost(walletHostName)
    }

    preparingLabel.font = .systemFont(ofSize: 14)
    preparingLabel.text = "Preparing React Native controller…"
    preparingLabel.textAlignment = .center
    preparingLabel.textColor = .darkGray

    let stack = UIStackView(arrangedSubviews: [
      titleLabel,
      descriptionLabel,
      storeButton,
      walletButton,
      preparingLabel,
    ])
    stack.axis = .vertical
    stack.spacing = 12
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)

    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
      stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
      stack.centerYAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerYAnchor),
      storeButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 50),
      walletButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 50),
    ])

    setControllerReady(isControllerReady)
    view.accessibilityIdentifier = "native_main"
  }

  func setControllerReady(_ isReady: Bool) {
    isControllerReady = isReady
    storeButton.isEnabled = isReady
    walletButton.isEnabled = isReady
    preparingLabel.isHidden = isReady
  }

  private func configureButton(
    _ button: UIButton,
    title: String,
    accessibilityIdentifier: String,
    action: @escaping () -> Void
  ) {
    var configuration = UIButton.Configuration.filled()
    configuration.title = title
    configuration.cornerStyle = .medium
    button.configuration = configuration
    button.accessibilityIdentifier = accessibilityIdentifier
    button.addAction(UIAction { _ in action() }, for: .touchUpInside)
  }
}

final class PortalHostViewController: UIViewController {
  private let hostName: String
  // Defer Fabric host creation until after React has booted so feature-flag
  // overrides are not locked by RCTViewComponentView init.
  private let portalHostView = PortalHostContainerView(frame: .zero, deferredActivation: true)

  init(hostName: String) {
    self.hostName = hostName
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    nil
  }

  override func loadView() {
    let rootView = UIView()
    rootView.backgroundColor = .black
    rootView.accessibilityIdentifier = "rn_portal_host"

    portalHostView.translatesAutoresizingMaskIntoConstraints = false
    rootView.addSubview(portalHostView)
    NSLayoutConstraint.activate([
      portalHostView.leadingAnchor.constraint(equalTo: rootView.leadingAnchor),
      portalHostView.trailingAnchor.constraint(equalTo: rootView.trailingAnchor),
      portalHostView.topAnchor.constraint(equalTo: rootView.topAnchor),
      portalHostView.bottomAnchor.constraint(equalTo: rootView.bottomAnchor),
    ])

    view = rootView
    portalHostView.setName(hostName)
    portalHostView.activateIfNeeded()
  }

  deinit {
    portalHostView.invalidate()
  }
}
