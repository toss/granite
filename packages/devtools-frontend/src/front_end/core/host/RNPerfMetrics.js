// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
let instance = null;
export function getInstance() {
    if (instance === null) {
        instance = new RNPerfMetrics();
    }
    return instance;
}
class RNPerfMetrics {
    #consoleErrorMethod = 'error';
    #listeners = new Set();
    #launchId = null;
    // map of panel location to panel name
    #currentPanels = new Map();
    addEventListener(listener) {
        this.#listeners.add(listener);
        const unsubscribe = () => {
            this.#listeners.delete(listener);
        };
        return unsubscribe;
    }
    removeAllEventListeners() {
        this.#listeners.clear();
    }
    sendEvent(event) {
        if (globalThis.enableReactNativePerfMetrics !== true) {
            return;
        }
        const decoratedEvent = this.#decorateEvent(event);
        const errors = [];
        for (const listener of this.#listeners) {
            try {
                listener(decoratedEvent);
            }
            catch (e) {
                errors.push(e);
            }
        }
        if (errors.length > 0) {
            const error = new AggregateError(errors);
            console.error('Error occurred when calling event listeners', error);
        }
    }
    registerPerfMetricsGlobalPostMessageHandler() {
        if (globalThis.enableReactNativePerfMetrics !== true ||
            globalThis.enableReactNativePerfMetricsGlobalPostMessage !== true) {
            return;
        }
        this.addEventListener(event => {
            window.postMessage({ event, tag: 'react-native-chrome-devtools-perf-metrics' }, window.location.origin);
        });
    }
    registerGlobalErrorReporting() {
        window.addEventListener('error', event => {
            const [message, error] = maybeWrapError(`[RNPerfMetrics] uncaught error: ${event.message}`, event.error);
            this.sendEvent({
                eventName: 'Browser.Error',
                params: {
                    type: 'error',
                    message,
                    error,
                },
            });
        }, { passive: true });
        window.addEventListener('unhandledrejection', event => {
            const [message, error] = maybeWrapError('[RNPerfMetrics] unhandled promise rejection', event.reason);
            this.sendEvent({
                eventName: 'Browser.Error',
                params: {
                    type: 'rejectedPromise',
                    message,
                    error,
                },
            });
        }, { passive: true });
        // Indirection for `console` ensures minifier won't strip this out.
        const cons = globalThis.console;
        const originalConsoleError = cons[this.#consoleErrorMethod];
        cons[this.#consoleErrorMethod] = (...args) => {
            try {
                const maybeError = args[0];
                const [message, error] = maybeWrapError('[RNPerfMetrics] console.error', maybeError);
                this.sendEvent({ eventName: 'Browser.Error', params: { message, error, type: 'consoleError' } });
            }
            catch (e) {
                const [message, error] = maybeWrapError('[RNPerfMetrics] Error handling console.error', e);
                this.sendEvent({ eventName: 'Browser.Error', params: { message, error, type: 'consoleError' } });
            }
            finally {
                originalConsoleError.apply(cons, args);
            }
        };
    }
    setLaunchId(launchId) {
        this.#launchId = launchId;
    }
    entryPointLoadingStarted(entryPoint) {
        this.sendEvent({
            eventName: 'Entrypoint.LoadingStarted',
            entryPoint,
        });
    }
    entryPointLoadingFinished(entryPoint) {
        this.sendEvent({
            eventName: 'Entrypoint.LoadingFinished',
            entryPoint,
        });
    }
    browserVisibilityChanged(visibilityState) {
        this.sendEvent({
            eventName: 'Browser.VisibilityChange',
            params: {
                visibilityState,
            },
        });
    }
    remoteDebuggingTerminated(reason) {
        this.sendEvent({ eventName: 'Connection.DebuggingTerminated', params: { reason } });
    }
    developerResourceLoadingStarted(parsedURL, loadingMethod) {
        const url = maybeTruncateDeveloperResourceUrl(parsedURL);
        this.sendEvent({ eventName: 'DeveloperResource.LoadingStarted', params: { url, loadingMethod } });
    }
    developerResourceLoadingFinished(parsedURL, loadingMethod, result) {
        const url = maybeTruncateDeveloperResourceUrl(parsedURL);
        this.sendEvent({
            eventName: 'DeveloperResource.LoadingFinished',
            params: {
                url,
                loadingMethod,
                success: result.success,
                errorMessage: result.errorDescription?.message,
            },
        });
    }
    fuseboxSetClientMetadataStarted() {
        this.sendEvent({ eventName: 'FuseboxSetClientMetadataStarted' });
    }
    fuseboxSetClientMetadataFinished(success, maybeError) {
        if (success) {
            this.sendEvent({ eventName: 'FuseboxSetClientMetadataFinished', params: { success: true } });
        }
        else {
            const [errorMessage, error] = maybeWrapError('[RNPerfMetrics] Fusebox setClientMetadata failed', maybeError);
            this.sendEvent({
                eventName: 'FuseboxSetClientMetadataFinished',
                params: {
                    success: false,
                    error,
                    errorMessage,
                },
            });
        }
    }
    heapSnapshotStarted() {
        this.sendEvent({
            eventName: 'MemoryPanelActionStarted',
            params: {
                action: 'snapshot',
            },
        });
    }
    heapSnapshotFinished(success) {
        this.sendEvent({
            eventName: 'MemoryPanelActionFinished',
            params: {
                action: 'snapshot',
                success,
            },
        });
    }
    heapProfilingStarted() {
        this.sendEvent({
            eventName: 'MemoryPanelActionStarted',
            params: {
                action: 'profiling',
            },
        });
    }
    heapProfilingFinished(success) {
        this.sendEvent({
            eventName: 'MemoryPanelActionFinished',
            params: {
                action: 'profiling',
                success,
            },
        });
    }
    heapSamplingStarted() {
        this.sendEvent({
            eventName: 'MemoryPanelActionStarted',
            params: {
                action: 'sampling',
            },
        });
    }
    heapSamplingFinished(success) {
        this.sendEvent({
            eventName: 'MemoryPanelActionFinished',
            params: {
                action: 'sampling',
                success,
            },
        });
    }
    panelShown(_panelName, _isLaunching) {
        // no-op
        // We only care about the "main" and "drawer" panels for now via panelShownInLocation(…)
        // (This function is called for other "sub"-panels)
    }
    panelClosed(panelName) {
        this.sendEvent({ eventName: 'PanelClosed', params: { panelName } });
    }
    panelShownInLocation(panelName, location) {
        // The current panel name will be sent along via #decorateEvent(…)
        this.sendEvent({ eventName: 'PanelShown', params: { location, newPanelName: panelName } });
        // So we should only update the current panel name to the new one after sending the event
        this.#currentPanels.set(location, panelName);
    }
    #decorateEvent(event) {
        const commonFields = {
            timestamp: getPerfTimestamp(),
            launchId: this.#launchId,
            currentPanels: this.#currentPanels,
        };
        return {
            ...event,
            ...commonFields,
        };
    }
}
function getPerfTimestamp() {
    return performance.timeOrigin + performance.now();
}
function maybeTruncateDeveloperResourceUrl(parsedURL) {
    const { url } = parsedURL;
    return parsedURL.isHttpOrHttps() ? url : `${url.slice(0, 100)} …(omitted ${url.length - 100} characters)`;
}
function maybeWrapError(baseMessage, error) {
    if (error instanceof Error) {
        const message = `${baseMessage}: ${error.message}`;
        return [message, error];
    }
    const message = `${baseMessage}: ${String(error)}`;
    return [message, new Error(message, { cause: error })];
}
//# sourceMappingURL=RNPerfMetrics.js.map