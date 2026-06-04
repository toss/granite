import UIKit
import BrickModule
import GraniteBrownfield

final class GraniteBrownfieldModule: BrickModuleBase, GraniteBrownfieldModuleSpec {
  private weak var viewController: UIViewController?
  private let schemeUriProvider: () -> String

  var schemeUri: String {
    schemeUriProvider()
  }

  init(viewController: UIViewController, schemeUriProvider: @escaping () -> String) {
    self.viewController = viewController
    self.schemeUriProvider = schemeUriProvider
    super.init(moduleName: "GraniteBrownfieldModule")
  }

  func getSchemeUri() throws -> String {
    schemeUri
  }

  func closeView() async throws {
    await MainActor.run {
      if let navigationController = viewController?.navigationController {
        navigationController.popViewController(animated: true)
        return
      }

      viewController?.dismiss(animated: true)
    }
  }
}
