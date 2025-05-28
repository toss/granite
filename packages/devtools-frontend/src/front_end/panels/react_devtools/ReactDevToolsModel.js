// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import * as ReactNativeModels from '../../models/react_native/react_native.js';
import * as ReactDevTools from '../../third_party/react-devtools/react-devtools.js';
export class ReactDevToolsModel extends SDK.SDKModel.SDKModel {
    static FUSEBOX_BINDING_NAMESPACE = 'react-devtools';
    #wall;
    #bindingsModel;
    #listeners = new Set();
    #initializeCalled = false;
    #initialized = false;
    #bridge = null;
    #store = null;
    constructor(target) {
        super(target);
        this.#wall = {
            listen: (listener) => {
                this.#listeners.add(listener);
                return () => {
                    this.#listeners.delete(listener);
                };
            },
            send: (event, payload) => void this.#sendMessage({ event, payload }),
        };
        const bindingsModel = target.model(ReactNativeModels.ReactDevToolsBindingsModel.ReactDevToolsBindingsModel);
        if (bindingsModel === null) {
            throw new Error('Failed to construct ReactDevToolsModel: ReactDevToolsBindingsModel was null');
        }
        this.#bindingsModel = bindingsModel;
        bindingsModel.addEventListener("BackendExecutionContextCreated" /* ReactNativeModels.ReactDevToolsBindingsModel.Events.BackendExecutionContextCreated */, this.#handleBackendExecutionContextCreated, this);
        bindingsModel.addEventListener("BackendExecutionContextUnavailable" /* ReactNativeModels.ReactDevToolsBindingsModel.Events.BackendExecutionContextUnavailable */, this.#handleBackendExecutionContextUnavailable, this);
        bindingsModel.addEventListener("BackendExecutionContextDestroyed" /* ReactNativeModels.ReactDevToolsBindingsModel.Events.BackendExecutionContextDestroyed */, this.#handleBackendExecutionContextDestroyed, this);
        // Notify backend if Chrome DevTools was closed, marking frontend as disconnected
        window.addEventListener('beforeunload', this.#handleBeforeUnload);
    }
    dispose() {
        this.#bridge?.removeListener('reloadAppForProfiling', this.#handleReloadAppForProfiling);
        this.#bridge?.shutdown();
        this.#bindingsModel.removeEventListener("BackendExecutionContextCreated" /* ReactNativeModels.ReactDevToolsBindingsModel.Events.BackendExecutionContextCreated */, this.#handleBackendExecutionContextCreated, this);
        this.#bindingsModel.removeEventListener("BackendExecutionContextUnavailable" /* ReactNativeModels.ReactDevToolsBindingsModel.Events.BackendExecutionContextUnavailable */, this.#handleBackendExecutionContextUnavailable, this);
        this.#bindingsModel.removeEventListener("BackendExecutionContextDestroyed" /* ReactNativeModels.ReactDevToolsBindingsModel.Events.BackendExecutionContextDestroyed */, this.#handleBackendExecutionContextDestroyed, this);
        window.removeEventListener('beforeunload', this.#handleBeforeUnload);
        this.#bridge = null;
        this.#store = null;
        this.#listeners.clear();
    }
    ensureInitialized() {
        if (this.#initializeCalled) {
            return;
        }
        this.#initializeCalled = true;
        void this.#initialize();
    }
    async #initialize() {
        try {
            const bindingsModel = this.#bindingsModel;
            await bindingsModel.enable();
            bindingsModel.subscribeToDomainMessages(ReactDevToolsModel.FUSEBOX_BINDING_NAMESPACE, message => this.#handleMessage(message));
            await bindingsModel.initializeDomain(ReactDevToolsModel.FUSEBOX_BINDING_NAMESPACE);
            this.#initialized = true;
            this.#finishInitializationAndNotify();
        }
        catch (e) {
            this.dispatchEventToListeners("InitializationFailed" /* Events.InitializationFailed */, e.message);
        }
    }
    isInitialized() {
        return this.#initialized;
    }
    getBridgeOrThrow() {
        if (this.#bridge === null) {
            throw new Error('Failed to get bridge from ReactDevToolsModel: bridge was null');
        }
        return this.#bridge;
    }
    getStoreOrThrow() {
        if (this.#store === null) {
            throw new Error('Failed to get store from ReactDevToolsModel: store was null');
        }
        return this.#store;
    }
    #handleMessage(message) {
        if (!message) {
            return;
        }
        for (const listener of this.#listeners) {
            listener(message);
        }
    }
    async #sendMessage(message) {
        const rdtBindingsModel = this.#bindingsModel;
        if (!rdtBindingsModel) {
            throw new Error('Failed to send message from ReactDevToolsModel: ReactDevToolsBindingsModel was null');
        }
        return rdtBindingsModel.sendMessage(ReactDevToolsModel.FUSEBOX_BINDING_NAMESPACE, message);
    }
    #handleBeforeUnload = () => {
        this.#bridge?.shutdown();
    };
    #handleBackendExecutionContextCreated() {
        const rdtBindingsModel = this.#bindingsModel;
        if (!rdtBindingsModel) {
            throw new Error('ReactDevToolsModel failed to handle BackendExecutionContextCreated event: ReactDevToolsBindingsModel was null');
        }
        // This could happen if the app was reloaded while ReactDevToolsBindingsModel was initializing
        if (!rdtBindingsModel.isEnabled()) {
            this.ensureInitialized();
        }
        else {
            this.#finishInitializationAndNotify();
        }
    }
    #finishInitializationAndNotify() {
        this.#bridge = ReactDevTools.createBridge(this.#wall);
        this.#store = ReactDevTools.createStore(this.#bridge, {
            supportsReloadAndProfile: true,
        });
        this.#bridge.addListener('reloadAppForProfiling', this.#handleReloadAppForProfiling);
        this.dispatchEventToListeners("InitializationCompleted" /* Events.InitializationCompleted */);
    }
    #handleReloadAppForProfiling() {
        SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages(false);
    }
    #handleBackendExecutionContextUnavailable({ data: errorMessage }) {
        this.dispatchEventToListeners("InitializationFailed" /* Events.InitializationFailed */, errorMessage);
    }
    #handleBackendExecutionContextDestroyed() {
        this.#bridge?.shutdown();
        this.#bridge = null;
        this.#store = null;
        this.#listeners.clear();
        this.dispatchEventToListeners("Destroyed" /* Events.Destroyed */);
    }
}
SDK.SDKModel.SDKModel.register(ReactDevToolsModel, { capabilities: 4 /* SDK.Target.Capability.JS */, autostart: false });
//# sourceMappingURL=ReactDevToolsModel.js.map