//
//  GraniteNativeFactory.swift
//  GraniteScreen
//
//  Swift implementation of GraniteNativeFactory
//

import Foundation
import ObjectiveC
import React_RCTAppDelegate
import UIKit

@objcMembers
open class GraniteNativeFactory: RCTReactNativeFactory {

    open func view(
        withModuleName moduleName: String,
        initialProperties initProps: [AnyHashable: Any]?,
        launchOptions: [AnyHashable: Any]?
    ) -> UIView? {
        return self.rootViewFactory.view(
            withModuleName: moduleName,
            initialProperties: initProps,
            launchOptions: launchOptions
        )
    }

    @objc(getModuleInstanceFromClass:)
    open func getModuleInstance(from moduleClass: AnyClass) -> Any? {
        return GraniteDefaultModuleProvider.defaultModuleInstance(
            for: moduleClass,
            dependencyProvider: delegate?.dependencyProvider
        )
    }
}
