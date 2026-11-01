import Foundation
import React

final class GraniteReactHost {
    var startCount = 0

    func graniteHostDidStart() {
        startCount += 1
    }
}

let url = URL(fileURLWithPath: "/bundles/main.jsbundle")
let host = GraniteReactHost()
let delegate = ReactNativeFactoryDelegate(url: url)
delegate.reactHost = host
// The back button view is registered when the delegate is created, ahead of any bundle.
precondition(backButtonViewRegistrationCount() == 1)

precondition(delegate.bundleURL() == url)
precondition(delegate.sourceURL(for: RCTBridge()) == url)
precondition(readBridgelessEnabled(delegate))
delegate.hostDidStart(RCTHost())
precondition(baseHostStartCount() == 1)
precondition(host.startCount == 1)
print("Factory delegate compatibility passed")
