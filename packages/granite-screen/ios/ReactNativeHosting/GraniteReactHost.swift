//
//  GraniteReactHost.swift
//  GraniteScreen
//
//  Protocol for hosting React Native views - matches Android's GraniteReactHost
//

import React
import ReactAppDependencyProvider
import UIKit

/// Protocol for hosting React Native components in iOS ViewControllers
/// This matches Android's GraniteReactHost interface with Swift-style naming conventions
public protocol GraniteReactHost: AnyObject {
    var graniteBaseView: UIView? { get set }
    /// Bundle loader - property as it represents a configuration value
    /// Return nil to use the default bundle from app
    var bundleLoader: BundleLoadable { get }
    func graniteSetupDidStart()
    func graniteSetupDidFinish()
    func graniteSetupDidError(didFailWith error: Error)
    /// Module instance creation (same as Objective-C)
    /// Returns nil by default, override to customize module creation
    func getModuleInstance(from moduleClass: AnyClass) -> Any?
    /// Module instance creation with a default instance from React Native
    /// Return a custom instance or nil to use the default
    func getModuleInstance(from moduleClass: AnyClass, defaultInstance: Any?) -> Any?
}

// Default implementation - returns nil
extension GraniteReactHost {
    public func getModuleInstance(from moduleClass: AnyClass) -> Any? {
        return nil  // Default returns nil
    }

    public func getModuleInstance(from moduleClass: AnyClass, defaultInstance: Any?) -> Any? {
        return getModuleInstance(from: moduleClass) ?? defaultInstance
    }
}
