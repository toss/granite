//
//  GraniteNativeFactoryDelegateImpl.swift
//  GraniteScreen
//
//  Swift implementation of GraniteNativeFactoryDelegate for custom bundle loading
//
import Foundation
import React
import React_RCTAppDelegate

public class ReactNativeFactoryDelegate: RCTDefaultReactNativeFactoryDelegate {
    private let url: URL

    public init(url: URL) {
        self.url = url
        super.init()
    }

    @objc public override func bundleURL() -> URL? {
        return url
    }

    public override func sourceURL(for bridge: RCTBridge) -> URL? {
        return bundleURL()
    }

    public override func bridgelessEnabled() -> Bool {
        return true
    }
}
