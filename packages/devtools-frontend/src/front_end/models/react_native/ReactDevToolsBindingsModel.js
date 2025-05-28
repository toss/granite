// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
// Hermes doesn't support Workers API yet, so there is a single execution context at the moment
// This will be used for an extra-check to future-proof this logic
// See https://github.com/facebook/react-native/blob/40b54ee671e593d125630391119b880aebc8393d/packages/react-native/ReactCommon/jsinspector-modern/InstanceTarget.cpp#L61
const MAIN_EXECUTION_CONTEXT_NAME = 'main';
const RUNTIME_GLOBAL = '__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__';
export class ReactDevToolsBindingsModel extends SDK.SDKModel.SDKModel {
    domainToListeners = new Map();
    messagingBindingName = null;
    enabled = false;
    fuseboxDispatcherIsInitialized = false;
    domainToMessageQueue = new Map();
    dispose() {
        this.domainToListeners.clear();
        this.domainToMessageQueue.clear();
        const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
        runtimeModel?.removeEventListener(SDK.RuntimeModel.Events.BindingCalled, this.bindingCalled, this);
        runtimeModel?.removeEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, this.onExecutionContextCreated, this);
        runtimeModel?.removeEventListener(SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.onExecutionContextDestroyed, this);
    }
    bindingCalled(event) {
        // If binding name is not initialized, then we failed to get its name
        if (this.messagingBindingName === null || event.data.name !== this.messagingBindingName) {
            return;
        }
        const serializedMessage = event.data.payload;
        let parsedMessage = null;
        try {
            parsedMessage = JSON.parse(serializedMessage);
        }
        catch (err) {
            throw new Error('Failed to parse bindingCalled event payload', { cause: err });
        }
        if (parsedMessage) {
            const domainName = parsedMessage.domain;
            if (this.fuseboxDispatcherIsInitialized) {
                // This should never happen.
                // It is expected that messages are flushed out right after we notify listeners with BackendExecutionContextCreated event
                if (!this.isDomainMessagesQueueEmpty(domainName)) {
                    throw new Error(`Attempted to send a message to domain ${domainName} while queue is not empty`);
                }
                this.dispatchMessageToDomainEventListeners(domainName, parsedMessage.message);
            }
            else {
                // This could happen when backend is already sending messages via binding
                // But ReactDevToolsBindingsModel is busy executing async tasks
                this.queueMessageForDomain(domainName, parsedMessage.message);
            }
        }
    }
    queueMessageForDomain(domainName, message) {
        let queue = this.domainToMessageQueue.get(domainName);
        if (!queue) {
            queue = [];
            this.domainToMessageQueue.set(domainName, queue);
        }
        queue.push(message);
    }
    flushOutDomainMessagesQueues() {
        for (const [domainName, queue] of this.domainToMessageQueue.entries()) {
            if (queue.length === 0) {
                continue;
            }
            for (const message of queue) {
                this.dispatchMessageToDomainEventListeners(domainName, message);
            }
            queue.splice(0, queue.length);
        }
    }
    isDomainMessagesQueueEmpty(domainName) {
        const queue = this.domainToMessageQueue.get(domainName);
        return queue === undefined || queue.length === 0;
    }
    subscribeToDomainMessages(domainName, listener) {
        let listeners = this.domainToListeners.get(domainName);
        if (!listeners) {
            listeners = new Set();
            this.domainToListeners.set(domainName, listeners);
        }
        listeners.add(listener);
    }
    unsubscribeFromDomainMessages(domainName, listener) {
        const listeners = this.domainToListeners.get(domainName);
        if (!listeners) {
            return;
        }
        listeners.delete(listener);
    }
    dispatchMessageToDomainEventListeners(domainName, message) {
        const listeners = this.domainToListeners.get(domainName);
        if (!listeners) {
            // No subscriptions, no need to throw, just don't notify.
            return;
        }
        const errors = [];
        for (const listener of listeners) {
            try {
                listener(message);
            }
            catch (e) {
                errors.push(e);
            }
        }
        if (errors.length > 0) {
            throw new AggregateError(errors, `Error occurred in ReactDevToolsBindingsModel while calling event listeners for domain ${domainName}`);
        }
    }
    async initializeDomain(domainName) {
        const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
        if (!runtimeModel) {
            throw new Error(`Failed to initialize domain ${domainName} for ReactDevToolsBindingsModel: runtime model is not available`);
        }
        await runtimeModel.agent.invoke_evaluate({ expression: `void ${RUNTIME_GLOBAL}.initializeDomain('${domainName}')` });
    }
    async sendMessage(domainName, message) {
        // If Execution Context is destroyed, do not attempt to send a message (evaluate anything)
        // This could happen when we destroy Bridge from ReactDevToolsModel, which attempts to send `shutdown` event
        // We still need to call `bridge.shutdown()` in order to unsubscribe all listeners on the Frontend (this) side
        if (!this.fuseboxDispatcherIsInitialized) {
            return;
        }
        const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
        if (!runtimeModel) {
            throw new Error(`Failed to send message from ReactDevToolsBindingsModel for domain ${domainName}: runtime model is not available`);
        }
        const serializedMessage = JSON.stringify(message);
        await runtimeModel.agent.invoke_evaluate({ expression: `${RUNTIME_GLOBAL}.sendMessage('${domainName}', '${serializedMessage}')` });
    }
    async enable() {
        if (this.enabled) {
            throw new Error('ReactDevToolsBindingsModel is already enabled');
        }
        const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
        if (!runtimeModel) {
            throw new Error('Failed to enable ReactDevToolsBindingsModel: runtime model is not available');
        }
        await this.waitForFuseboxDispatcherToBeInitialized()
            .then(() => runtimeModel.agent.invoke_evaluate({ expression: `${RUNTIME_GLOBAL}.BINDING_NAME` }))
            .then(response => {
            if (response.exceptionDetails) {
                throw new Error('Failed to get binding name for ReactDevToolsBindingsModel on a global: ' + response.exceptionDetails.text);
            }
            if (response.result.value === null || response.result.value === undefined) {
                throw new Error('Failed to get binding name for ReactDevToolsBindingsModel on a global: returned value is ' + String(response.result.value));
            }
            if (response.result.value === '') {
                throw new Error('Failed to get binding name for ReactDevToolsBindingsModel on a global: returned value is an empty string');
            }
            return response.result.value;
        })
            .then(bindingName => {
            this.messagingBindingName = bindingName;
            runtimeModel.addEventListener(SDK.RuntimeModel.Events.BindingCalled, this.bindingCalled, this);
            return runtimeModel.agent.invoke_addBinding({ name: bindingName });
        })
            .then(response => {
            const possiblyError = response.getError();
            if (possiblyError) {
                throw new Error('Failed to add binding for ReactDevToolsBindingsModel: ' + possiblyError);
            }
            this.enabled = true;
            this.initializeExecutionContextListeners();
        });
    }
    isEnabled() {
        return this.enabled;
    }
    initializeExecutionContextListeners() {
        const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
        if (!runtimeModel) {
            throw new Error('Failed to initialize execution context listeners for ReactDevToolsBindingsModel: runtime model is not available');
        }
        runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, this.onExecutionContextCreated, this);
        runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.onExecutionContextDestroyed, this);
    }
    onExecutionContextCreated({ data: executionContext }) {
        if (executionContext.name !== MAIN_EXECUTION_CONTEXT_NAME) {
            return;
        }
        void this.waitForFuseboxDispatcherToBeInitialized()
            .then(() => {
            this.dispatchEventToListeners("BackendExecutionContextCreated" /* Events.BackendExecutionContextCreated */);
            this.flushOutDomainMessagesQueues();
        })
            .catch((error) => this.dispatchEventToListeners("BackendExecutionContextUnavailable" /* Events.BackendExecutionContextUnavailable */, error.message));
    }
    onExecutionContextDestroyed({ data: executionContext }) {
        if (executionContext.name !== MAIN_EXECUTION_CONTEXT_NAME) {
            return;
        }
        this.fuseboxDispatcherIsInitialized = false;
        this.dispatchEventToListeners("BackendExecutionContextDestroyed" /* Events.BackendExecutionContextDestroyed */);
    }
    async waitForFuseboxDispatcherToBeInitialized(attempt = 1) {
        // Ideally, this should not be polling, but rather one `Runtime.evaluate` request with `awaitPromise` option
        // We need to support it in Hermes first, then we can migrate this to awaitPromise
        if (attempt >= 20) { // ~5 seconds
            throw new Error('Failed to wait for initialization: it took too long');
        }
        const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
        if (!runtimeModel) {
            throw new Error('Failed to wait for React DevTools dispatcher initialization: runtime model is not available');
        }
        await runtimeModel.agent.invoke_evaluate({
            expression: `globalThis.${RUNTIME_GLOBAL} != undefined`,
            returnByValue: true,
        })
            .then(response => {
            if (response.exceptionDetails) {
                throw new Error('Failed to wait for React DevTools dispatcher initialization: ' + response.exceptionDetails.text);
            }
            if (response.result.value === false) {
                // Wait for 250 ms and restart
                return new Promise(resolve => setTimeout(resolve, 250)).then(() => this.waitForFuseboxDispatcherToBeInitialized(attempt + 1));
            }
            this.fuseboxDispatcherIsInitialized = true;
            return;
        });
    }
}
SDK.SDKModel.SDKModel.register(ReactDevToolsBindingsModel, { capabilities: 4 /* SDK.Target.Capability.JS */, autostart: false });
//# sourceMappingURL=ReactDevToolsBindingsModel.js.map