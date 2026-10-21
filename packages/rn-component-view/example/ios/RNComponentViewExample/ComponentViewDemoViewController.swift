import GraniteRNComponentView
import UIKit

/// A native screen that shows the React Native component `ComponentViewDemo` in an `RNComponentView` per sizing.
final class ComponentViewDemoViewController: UIViewController {
  private static let componentName = "ComponentViewDemo"

  private var componentViews: [(title: String, view: RNComponentView)] = []
  private var componentItemCount = 1
  private var contentHeightFullWidthConstraint: NSLayoutConstraint?
  private var contentHeightNarrowWidthConstraint: NSLayoutConstraint?
  private var rendererObserver: NSObjectProtocol?

  deinit {
    if let rendererObserver {
      NotificationCenter.default.removeObserver(rendererObserver)
    }
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = "RNComponentView"
    view.backgroundColor = .systemBackground

    let titleLabel = UILabel()
    titleLabel.font = .systemFont(ofSize: 22, weight: .bold)
    titleLabel.numberOfLines = 0
    titleLabel.text = "React Native components in native views"

    let descriptionLabel = UILabel()
    descriptionLabel.font = .systemFont(ofSize: 15)
    descriptionLabel.numberOfLines = 0
    descriptionLabel.text =
      "Each box below is an RNComponentView that shows the React Native component ComponentViewDemo, sized by its content."
    descriptionLabel.textColor = .secondaryLabel

    let stack = UIStackView(arrangedSubviews: [titleLabel, descriptionLabel])
    stack.axis = .vertical
    stack.spacing = 8
    stack.translatesAutoresizingMaskIntoConstraints = false
    addComponentViewDemo(to: stack)

    let scrollView = UIScrollView()
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(scrollView)
    scrollView.addSubview(stack)

    NSLayoutConstraint.activate([
      scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      scrollView.topAnchor.constraint(equalTo: view.topAnchor),
      scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      stack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor, constant: 24),
      stack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor, constant: -24),
      stack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor, constant: 24),
      stack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor, constant: -24),
      stack.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor, constant: -48),
    ])

    // The views are created before React Native boots, so their Portal hosts wait for activation (see
    // `PortalHostContainerView`). The renderer attaches once the runtime runs it.
    rendererObserver = NotificationCenter.default.addObserver(
      forName: .RNComponentRendererDidChange,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.activateComponentViewsIfRendererAttached()
    }
    activateComponentViewsIfRendererAttached()
  }

  private func activateComponentViewsIfRendererAttached() {
    guard RNComponentSessions.isRendererAttached else {
      return
    }
    componentViews.forEach { $0.view.activateIfNeeded() }
  }

  private func addComponentViewDemo(to stack: UIStackView) {
    let contentHeightView = componentView(title: "contentHeight", sizing: .contentHeight)
    let contentHeightRow = addLabeledComponentView(contentHeightView, title: "contentHeight", alignment: .leading, to: stack)
    contentHeightFullWidthConstraint = contentHeightView.widthAnchor.constraint(equalTo: contentHeightRow.widthAnchor)
    contentHeightNarrowWidthConstraint = contentHeightView.widthAnchor.constraint(equalToConstant: 220)
    contentHeightFullWidthConstraint?.isActive = true

    let contentSizeView = componentView(title: "contentSize", sizing: .contentSize)
    let contentSizeRow = addLabeledComponentView(contentSizeView, title: "contentSize", alignment: .leading, to: stack)
    contentSizeView.widthAnchor.constraint(lessThanOrEqualTo: contentSizeRow.widthAnchor).isActive = true

    let constrainedView = componentView(title: "constrained", sizing: .constrained)
    let constrainedRow = addLabeledComponentView(constrainedView, title: "constrained", alignment: .fill, to: stack)
    constrainedView.heightAnchor.constraint(equalToConstant: 200).isActive = true

    componentViews = [
      ("contentHeight", contentHeightView),
      ("contentSize", contentSizeView),
      ("constrained", constrainedView),
    ]

    let controls = UIStackView(arrangedSubviews: [
      demoButton(title: "Add item") { [weak self] in
        guard let self else { return }
        self.updateComponentItemCount(self.componentItemCount + 1)
      },
      demoButton(title: "Remove item") { [weak self] in
        guard let self else { return }
        self.updateComponentItemCount(max(0, self.componentItemCount - 1))
      },
      demoButton(title: "Toggle width") { [weak self] in
        self?.toggleContentHeightWidth()
      },
    ])
    controls.axis = .horizontal
    controls.spacing = 8
    controls.distribution = .fillEqually
    stack.setCustomSpacing(16, after: constrainedRow)
    stack.addArrangedSubview(controls)
  }

  private func componentView(title: String, sizing: RNComponentViewSizing) -> RNComponentView {
    RNComponentView(
      componentName: Self.componentName,
      props: componentProps(title: title, sizing: sizing),
      sizing: sizing,
      bundleFilePath: nil,
      deferredActivation: true
    )
  }

  private func componentProps(title: String, sizing: RNComponentViewSizing) -> [String: Any] {
    [
      "title": title,
      "itemCount": componentItemCount,
      "fillsView": sizing == .constrained,
    ]
  }

  private func addLabeledComponentView(
    _ componentView: RNComponentView,
    title: String,
    alignment: UIStackView.Alignment,
    to stack: UIStackView
  ) -> UIStackView {
    let label = UILabel()
    label.font = .systemFont(ofSize: 14)
    label.text = title
    label.textColor = .secondaryLabel
    if let previousView = stack.arrangedSubviews.last {
      stack.setCustomSpacing(20, after: previousView)
    }
    stack.addArrangedSubview(label)
    stack.setCustomSpacing(6, after: label)

    let row = UIStackView(arrangedSubviews: [componentView])
    row.axis = .vertical
    row.alignment = alignment
    stack.addArrangedSubview(row)
    return row
  }

  private func updateComponentItemCount(_ itemCount: Int) {
    componentItemCount = itemCount
    for (title, componentView) in componentViews {
      componentView.updateProps(componentProps(title: title, sizing: componentView.sizing))
    }
  }

  private func toggleContentHeightWidth() {
    guard let fullWidth = contentHeightFullWidthConstraint, let narrowWidth = contentHeightNarrowWidthConstraint else {
      return
    }
    let isNarrow = narrowWidth.isActive
    NSLayoutConstraint.deactivate([isNarrow ? narrowWidth : fullWidth])
    NSLayoutConstraint.activate([isNarrow ? fullWidth : narrowWidth])
  }

  private func demoButton(title: String, action: @escaping () -> Void) -> UIButton {
    var configuration = UIButton.Configuration.filled()
    configuration.title = title
    configuration.cornerStyle = .medium
    let button = UIButton(configuration: configuration)
    button.addAction(UIAction { _ in action() }, for: .touchUpInside)
    return button
  }
}
