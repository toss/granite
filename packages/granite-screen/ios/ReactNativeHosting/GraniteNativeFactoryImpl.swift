//
//  GraniteNativeFactoryImpl.swift
//  GraniteScreen
//
//  Wrapper for GraniteNativeFactory to enable module customization
//

import Foundation
import React_RCTAppDelegate

/// Internal wrapper class that bridges GraniteReactHost with GraniteNativeFactory
@objcMembers
public class GraniteNativeFactoryImpl: GraniteNativeFactory {
    weak var reactHost: GraniteReactHost?

    @objc(getModuleInstanceFromClass:)
    public override func getModuleInstance(from moduleClass: AnyClass) -> Any? {
        if let customInstance = reactHost?.getModuleInstance(from: moduleClass) {
            return customInstance
        }

        return super.getModuleInstance(from: moduleClass)
    }
}
