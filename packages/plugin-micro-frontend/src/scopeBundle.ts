import type { TransformBundleData } from '@granite-js/plugin-core';
import { parse } from '@babel/parser';
import { transformSourcemap } from './scopeBundleSourcemap';

const DEFAULT_SCOPE_BUNDLE_OPTIONS = { appName: 'app', name: 'remote' } as const;
const ENTRY_REGISTRY_PROPERTY = '__GRANITE_MICRO_FRONTEND_ENTRIES__';
const SCOPE_REGISTRY_PROPERTY = '__GRANITE_MICRO_FRONTEND_SCOPES__';

export interface ScopeBundleOptions {
  readonly appName: string;
  readonly name: string;
}

export function scopeMicroFrontendBundle(
  bundle: TransformBundleData,
  options: ScopeBundleOptions = DEFAULT_SCOPE_BUNDLE_OPTIONS
): Promise<TransformBundleData> {
  return transformMicroFrontendBundle(bundle, options);
}

export function scopeBundleSource(source: string, options: ScopeBundleOptions = DEFAULT_SCOPE_BUNDLE_OPTIONS): string {
  return createScopeBundleTransform(source, options).source;
}

async function transformMicroFrontendBundle(
  bundle: TransformBundleData,
  options: ScopeBundleOptions
): Promise<TransformBundleData> {
  const transform = createScopeBundleTransform(bundle.source.text, options);

  bundle.source.contents = Buffer.from(transform.source);
  bundle.sourcemap.contents = Buffer.from(await transformSourcemap(bundle.sourcemap.text, transform));

  return bundle;
}

export interface ScopeBundleTransform {
  readonly source: string;
  readonly originalSource: string;
  readonly statementStartIndex: number;
  readonly statementEndIndex: number;
  readonly bodyStartIndex: number;
  readonly bodyEndIndex: number;
  readonly transformedBodyStartIndex: number;
  readonly transformedSuffixStartIndex: number;
}

function createScopeBundleTransform(
  source: string,
  options: ScopeBundleOptions = DEFAULT_SCOPE_BUNDLE_OPTIONS
): ScopeBundleTransform {
  const outerIIFE = findOuterIIFE(source);
  const prelude = getScopePrelude(options);
  const footer = getScopeFooter(options);
  const prefix = source.slice(0, outerIIFE.statementStartIndex);
  const body = source.slice(outerIIFE.bodyStartIndex, outerIIFE.bodyEndIndex);
  const suffix = source.slice(outerIIFE.statementEndIndex);
  const transformedBodyStartIndex = prefix.length + prelude.length;
  const transformedSuffixStartIndex = transformedBodyStartIndex + body.length + footer.length;

  return {
    source: [prefix, prelude, body, footer, suffix].join(''),
    originalSource: source,
    statementStartIndex: outerIIFE.statementStartIndex,
    statementEndIndex: outerIIFE.statementEndIndex,
    bodyStartIndex: outerIIFE.bodyStartIndex,
    bodyEndIndex: outerIIFE.bodyEndIndex,
    transformedBodyStartIndex,
    transformedSuffixStartIndex,
  };
}

function findOuterIIFE(source: string) {
  const ast = parse(source, {
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    errorRecovery: false,
    sourceType: 'script',
  });
  let outerIIFE: {
    statementStartIndex: number;
    statementEndIndex: number;
    bodyStartIndex: number;
    bodyEndIndex: number;
  } | null = null;

  for (const statement of ast.program.body) {
    if (statement.type !== 'ExpressionStatement') {
      continue;
    }

    const expression = statement.expression;
    if (expression.type !== 'CallExpression') {
      continue;
    }

    const callee = expression.callee;
    if (
      !(
        (callee.type === 'FunctionExpression' || callee.type === 'ArrowFunctionExpression') &&
        callee.body.type === 'BlockStatement' &&
        statement.start != null &&
        statement.end != null &&
        callee.body.start != null &&
        callee.body.end != null
      )
    ) {
      continue;
    }

    if (outerIIFE == null || statement.start > outerIIFE.statementStartIndex) {
      outerIIFE = {
        statementStartIndex: statement.start,
        statementEndIndex: statement.end,
        bodyStartIndex: callee.body.start + 1,
        bodyEndIndex: callee.body.end - 1,
      };
    }
  }

  if (outerIIFE == null) {
    throw new Error('Micro frontend bundle must be an esbuild IIFE output');
  }

  return outerIIFE;
}

function getScopePrelude(options: ScopeBundleOptions) {
  const scopedName = getScopedName(options);
  const entryFunctionName = getEntryFunctionName(scopedName);
  const factoryFunctionName = getFactoryFunctionName(scopedName);

  return `function ${entryFunctionName}(globalOverride, globalThisOverride, windowOverride, selfOverride) {
  var __graniteMicroFrontendHostGlobal = globalOverride === void 0 ? global : globalOverride;
  var __graniteMicroFrontendHostContext = __graniteMicroFrontendHostGlobal.__MICRO_FRONTEND__;
  var __graniteMicroFrontendHostShared =
    __graniteMicroFrontendHostContext == null || __graniteMicroFrontendHostContext.__SHARED__ == null
      ? null
      : __graniteMicroFrontendHostContext.__SHARED__;
    var __graniteMicroFrontendScopeContext = {
      __INSTANCES__: Object.assign([], {}),
      __SHARED__: Object.create(__graniteMicroFrontendHostShared),
      __DISPOSE__: []
    };
    // Pushed FIRST so LIFO draining runs it LAST — every other dispose hook
    // still sees usable entry locals. Any service closure that outlives the
    // scope pins this entry invocation's environment through its parent-scope
    // chain; nulling the locals keeps a stray survivor from pinning the scope
    // context, proxy, timer registry, and host references.
    __graniteMicroFrontendScopeContext.__DISPOSE__.push(function () {
      __graniteMicroFrontendScopeContext = null;
      __graniteMicroFrontendScopeTarget = null;
      __graniteMicroFrontendScopedGlobal = null;
      __graniteMicroFrontendScopedAmbient = null;
      __graniteMicroFrontendTimerHandles = null;
      __graniteMicroFrontendNetHandles = null;
      __graniteMicroFrontendSubscriptions = null;
      __graniteMicroFrontendGlobalNamesSnapshot = null;
      __graniteMicroFrontendPreviousErrorHandler = null;
      __graniteMicroFrontendRuntimeGlobal = null;
      __graniteMicroFrontendRuntimeGlobalThis = null;
      __graniteMicroFrontendRuntimeWindow = null;
      __graniteMicroFrontendRuntimeSelf = null;
      __graniteMicroFrontendHostContext = null;
      __graniteMicroFrontendHostShared = null;
      __graniteMicroFrontendEntryResult = null;
    });
    var __graniteMicroFrontendDisposed = false;
    var __graniteMicroFrontendTimerHandles = {
      timeouts: new Set(),
      intervals: new Set(),
      immediates: new Set(),
      animationFrames: new Set(),
      idleCallbacks: new Set()
    };
    var __graniteMicroFrontendNetHandles = new Set();
    var __graniteMicroFrontendSubscriptions = new Set();
    var __graniteMicroFrontendPreviousErrorHandler = null;
    var __graniteMicroFrontendErrorHandlerTouched = false;
    var __graniteMicroFrontendGlobalNamesSnapshot = null;
    function __graniteMicroFrontendTrackTimerStart(startName, handles, removeOnFire) {
      var start = __graniteMicroFrontendHostGlobal[startName];
      if (typeof start !== "function") return start;
      return function (callback) {
        if (__graniteMicroFrontendDisposed) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[micro-frontend] " + startName + " called after scope dispose — ignored");
          }
          return 0;
        }
        var args = Array.prototype.slice.call(arguments, 1);
        var handle;
        var trackedCallback =
          removeOnFire && typeof callback === "function"
            ? function () {
                handles.delete(handle);
                return callback.apply(this, arguments);
              }
            : callback;
        handle = start.apply(__graniteMicroFrontendHostGlobal, [trackedCallback].concat(args));
        handles.add(handle);
        return handle;
      };
    }
    function __graniteMicroFrontendTrackTimerClear(clearName, handles) {
      var clear = __graniteMicroFrontendHostGlobal[clearName];
      if (typeof clear !== "function") return clear;
      return function (handle) {
        handles.delete(handle);
        return clear.call(__graniteMicroFrontendHostGlobal, handle);
      };
    }
    function __graniteMicroFrontendTrackSubscription(subscription) {
      if (
        !__graniteMicroFrontendDisposed &&
        subscription != null &&
        typeof subscription.remove === "function"
      ) {
        __graniteMicroFrontendSubscriptions.add(subscription);
      }
      return subscription;
    }
    var __graniteMicroFrontendScopedQueueMicrotask =
      typeof __graniteMicroFrontendHostGlobal.queueMicrotask === "function"
        ? function (callback) {
            // Microtasks cannot be cancelled; gate the callback instead.
            return __graniteMicroFrontendHostGlobal.queueMicrotask(function () {
              if (!__graniteMicroFrontendDisposed) callback();
            });
          }
        : __graniteMicroFrontendHostGlobal.queueMicrotask;
    var __graniteMicroFrontendScopedFetch =
      typeof __graniteMicroFrontendHostGlobal.fetch === "function"
        ? function (input, init) {
            var host = __graniteMicroFrontendHostGlobal;
            if (typeof host.AbortController !== "function") return host.fetch(input, init);
            var controller = new host.AbortController();
            var options = init ? Object.assign({}, init) : {};
            var callerSignal = options.signal;
            if (callerSignal) {
              if (callerSignal.aborted) controller.abort();
              else if (typeof callerSignal.addEventListener === "function") {
                callerSignal.addEventListener("abort", function () { controller.abort(); });
              }
            }
            options.signal = controller.signal;
            var netEntry = { abort: function () { controller.abort(); } };
            __graniteMicroFrontendNetHandles.add(netEntry);
            var settle = function () {
              if (__graniteMicroFrontendNetHandles !== null) __graniteMicroFrontendNetHandles.delete(netEntry);
            };
            var result = host.fetch(input, options);
            result.then(settle, settle);
            return result;
          }
        : __graniteMicroFrontendHostGlobal.fetch;
    var __graniteMicroFrontendScopedXMLHttpRequest = (function () {
      var HostXMLHttpRequest = __graniteMicroFrontendHostGlobal.XMLHttpRequest;
      if (typeof HostXMLHttpRequest !== "function") return HostXMLHttpRequest;
      function ScopedXMLHttpRequest() {
        var request = new HostXMLHttpRequest();
        var netEntry = { abort: function () { try { request.abort(); } catch (abortError) {} } };
        __graniteMicroFrontendNetHandles.add(netEntry);
        if (typeof request.addEventListener === "function") {
          request.addEventListener("loadend", function () {
            if (__graniteMicroFrontendNetHandles !== null) __graniteMicroFrontendNetHandles.delete(netEntry);
          });
        }
        return request;
      }
      ScopedXMLHttpRequest.prototype = HostXMLHttpRequest.prototype;
      var xhrStatics = ["UNSENT", "OPENED", "HEADERS_RECEIVED", "LOADING", "DONE"];
      for (var xhrStaticIndex = 0; xhrStaticIndex < xhrStatics.length; xhrStaticIndex++) {
        if (HostXMLHttpRequest[xhrStatics[xhrStaticIndex]] !== undefined) {
          ScopedXMLHttpRequest[xhrStatics[xhrStaticIndex]] = HostXMLHttpRequest[xhrStatics[xhrStaticIndex]];
        }
      }
      return ScopedXMLHttpRequest;
    })();
    var __graniteMicroFrontendScopedWebSocket = (function () {
      var HostWebSocket = __graniteMicroFrontendHostGlobal.WebSocket;
      if (typeof HostWebSocket !== "function") return HostWebSocket;
      function ScopedWebSocket(url, protocols, options) {
        var socket =
          options !== undefined
            ? new HostWebSocket(url, protocols, options)
            : protocols !== undefined
              ? new HostWebSocket(url, protocols)
              : new HostWebSocket(url);
        var netEntry = { abort: function () { try { socket.close(); } catch (closeError) {} } };
        __graniteMicroFrontendNetHandles.add(netEntry);
        if (typeof socket.addEventListener === "function") {
          socket.addEventListener("close", function () {
            if (__graniteMicroFrontendNetHandles !== null) __graniteMicroFrontendNetHandles.delete(netEntry);
          });
        }
        return socket;
      }
      ScopedWebSocket.prototype = HostWebSocket.prototype;
      var socketStatics = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
      for (var socketStaticIndex = 0; socketStaticIndex < socketStatics.length; socketStaticIndex++) {
        if (HostWebSocket[socketStatics[socketStaticIndex]] !== undefined) {
          ScopedWebSocket[socketStatics[socketStaticIndex]] = HostWebSocket[socketStatics[socketStaticIndex]];
        }
      }
      return ScopedWebSocket;
    })();
    var __graniteMicroFrontendScopedErrorUtils = (function () {
      var hostErrorUtils = __graniteMicroFrontendHostGlobal.ErrorUtils;
      if (hostErrorUtils == null) return hostErrorUtils;
      var facade = Object.create(hostErrorUtils);
      facade.setGlobalHandler = function (handler) {
        if (!__graniteMicroFrontendErrorHandlerTouched) {
          __graniteMicroFrontendErrorHandlerTouched = true;
          __graniteMicroFrontendPreviousErrorHandler =
            typeof hostErrorUtils.getGlobalHandler === "function" ? hostErrorUtils.getGlobalHandler() : null;
        }
        return hostErrorUtils.setGlobalHandler(handler);
      };
      return facade;
    })();
    var __graniteMicroFrontendScopedAmbient = {
      setTimeout: __graniteMicroFrontendTrackTimerStart("setTimeout", __graniteMicroFrontendTimerHandles.timeouts, true),
      clearTimeout: __graniteMicroFrontendTrackTimerClear("clearTimeout", __graniteMicroFrontendTimerHandles.timeouts),
      setInterval: __graniteMicroFrontendTrackTimerStart("setInterval", __graniteMicroFrontendTimerHandles.intervals, false),
      clearInterval: __graniteMicroFrontendTrackTimerClear("clearInterval", __graniteMicroFrontendTimerHandles.intervals),
      setImmediate: __graniteMicroFrontendTrackTimerStart("setImmediate", __graniteMicroFrontendTimerHandles.immediates, true),
      clearImmediate: __graniteMicroFrontendTrackTimerClear("clearImmediate", __graniteMicroFrontendTimerHandles.immediates),
      requestAnimationFrame: __graniteMicroFrontendTrackTimerStart("requestAnimationFrame", __graniteMicroFrontendTimerHandles.animationFrames, true),
      cancelAnimationFrame: __graniteMicroFrontendTrackTimerClear("cancelAnimationFrame", __graniteMicroFrontendTimerHandles.animationFrames),
      requestIdleCallback: __graniteMicroFrontendTrackTimerStart("requestIdleCallback", __graniteMicroFrontendTimerHandles.idleCallbacks, true),
      cancelIdleCallback: __graniteMicroFrontendTrackTimerClear("cancelIdleCallback", __graniteMicroFrontendTimerHandles.idleCallbacks),
      queueMicrotask: __graniteMicroFrontendScopedQueueMicrotask,
      fetch: __graniteMicroFrontendScopedFetch,
      XMLHttpRequest: __graniteMicroFrontendScopedXMLHttpRequest,
      WebSocket: __graniteMicroFrontendScopedWebSocket,
      ErrorUtils: __graniteMicroFrontendScopedErrorUtils
    };
    __graniteMicroFrontendScopeContext.__DISPOSE__.push(function () {
      __graniteMicroFrontendDisposed = true;
      var handles = __graniteMicroFrontendTimerHandles;
      var host = __graniteMicroFrontendHostGlobal;
      handles.timeouts.forEach(function (handle) { host.clearTimeout(handle); });
      handles.intervals.forEach(function (handle) { host.clearInterval(handle); });
      if (typeof host.clearImmediate === "function") {
        handles.immediates.forEach(function (handle) { host.clearImmediate(handle); });
      }
      if (typeof host.cancelAnimationFrame === "function") {
        handles.animationFrames.forEach(function (handle) { host.cancelAnimationFrame(handle); });
      }
      if (typeof host.cancelIdleCallback === "function") {
        handles.idleCallbacks.forEach(function (handle) { host.cancelIdleCallback(handle); });
      }
      handles.timeouts.clear();
      handles.intervals.clear();
      handles.immediates.clear();
      handles.animationFrames.clear();
      handles.idleCallbacks.clear();
      __graniteMicroFrontendNetHandles.forEach(function (netEntry) {
        try { netEntry.abort(); } catch (abortError) {}
      });
      __graniteMicroFrontendNetHandles.clear();
      __graniteMicroFrontendSubscriptions.forEach(function (subscription) {
        try { subscription.remove(); } catch (removeError) {}
      });
      __graniteMicroFrontendSubscriptions.clear();
      if (__graniteMicroFrontendErrorHandlerTouched && host.ErrorUtils != null) {
        try { host.ErrorUtils.setGlobalHandler(__graniteMicroFrontendPreviousErrorHandler); } catch (restoreError) {}
      }
      if (__graniteMicroFrontendGlobalNamesSnapshot !== null) {
        var escapedNames = [];
        var currentNames = Object.getOwnPropertyNames(host);
        for (var nameIndex = 0; nameIndex < currentNames.length; nameIndex++) {
          var globalName = currentNames[nameIndex];
          if (
            !__graniteMicroFrontendGlobalNamesSnapshot.has(globalName) &&
            globalName.indexOf("__GRANITE_MICRO_FRONTEND") !== 0 &&
            globalName.indexOf("__graniteMicroFrontend") !== 0
          ) {
            escapedNames.push(globalName);
          }
        }
        if (escapedNames.length > 0 && typeof console !== "undefined" && console.warn) {
          // Detection only: keys may belong to other services evaluated during
          // this scope's lifetime, so deleting here would be unsafe.
          console.warn(
            "[micro-frontend] scope " + ${JSON.stringify(options.appName)} + " leaked global keys: " + escapedNames.join(", ")
          );
        }
      }
    });
    (function () {
      var hostSharedRegistry = __graniteMicroFrontendHostShared;
      if (hostSharedRegistry == null || hostSharedRegistry["react-native"] == null) return;
      var hostSharedEntry = hostSharedRegistry["react-native"];
      var facadeNamespace = null;
      // Shadow the host's shared react-native entry with a per-scope facade so
      // module-scope emitter subscriptions are released on dispose. Components
      // and everything un-wrapped pass through by prototype (identity kept).
      __graniteMicroFrontendScopeContext.__SHARED__["react-native"] = {
        get: function () {
          if (facadeNamespace === null) {
            facadeNamespace = __graniteMicroFrontendCreateReactNativeFacade(hostSharedEntry.get());
          }
          return facadeNamespace;
        },
        loaded: true
      };
      function wrapEmitterLike(hostObject, methodNames) {
        if (hostObject == null) return hostObject;
        var facade = Object.create(hostObject);
        for (var methodIndex = 0; methodIndex < methodNames.length; methodIndex++) {
          (function (methodName) {
            var method = hostObject[methodName];
            if (typeof method !== "function") return;
            facade[methodName] = function () {
              return __graniteMicroFrontendTrackSubscription(method.apply(hostObject, arguments));
            };
          })(methodNames[methodIndex]);
        }
        return facade;
      }
      function __graniteMicroFrontendCreateReactNativeFacade(reactNativeNamespace) {
        var facade = Object.create(reactNativeNamespace);
        facade.DeviceEventEmitter = wrapEmitterLike(reactNativeNamespace.DeviceEventEmitter, ["addListener"]);
        facade.AppState = wrapEmitterLike(reactNativeNamespace.AppState, ["addEventListener"]);
        facade.Dimensions = wrapEmitterLike(reactNativeNamespace.Dimensions, ["addEventListener"]);
        facade.Keyboard = wrapEmitterLike(reactNativeNamespace.Keyboard, ["addListener"]);
        facade.Linking = wrapEmitterLike(reactNativeNamespace.Linking, ["addEventListener"]);
        facade.BackHandler = wrapEmitterLike(reactNativeNamespace.BackHandler, ["addEventListener"]);
        var HostNativeEventEmitter = reactNativeNamespace.NativeEventEmitter;
        if (typeof HostNativeEventEmitter === "function") {
          var ScopedNativeEventEmitter = function () {
            return Reflect.construct(HostNativeEventEmitter, arguments, ScopedNativeEventEmitter);
          };
          ScopedNativeEventEmitter.prototype = Object.create(HostNativeEventEmitter.prototype);
          ScopedNativeEventEmitter.prototype.constructor = ScopedNativeEventEmitter;
          ScopedNativeEventEmitter.prototype.addListener = function () {
            return __graniteMicroFrontendTrackSubscription(
              HostNativeEventEmitter.prototype.addListener.apply(this, arguments)
            );
          };
          facade.NativeEventEmitter = ScopedNativeEventEmitter;
        }
        var hostInteractionManager = reactNativeNamespace.InteractionManager;
        if (hostInteractionManager != null && typeof hostInteractionManager.runAfterInteractions === "function") {
          var interactionManagerFacade = Object.create(hostInteractionManager);
          interactionManagerFacade.runAfterInteractions = function () {
            var handle = hostInteractionManager.runAfterInteractions.apply(hostInteractionManager, arguments);
            if (handle != null && typeof handle.cancel === "function") {
              var subscriptionEntry = { remove: function () { handle.cancel(); } };
              __graniteMicroFrontendTrackSubscription(subscriptionEntry);
              if (typeof handle.then === "function") {
                var settleInteraction = function () {
                  if (__graniteMicroFrontendSubscriptions !== null) {
                    __graniteMicroFrontendSubscriptions.delete(subscriptionEntry);
                  }
                };
                handle.then(settleInteraction, settleInteraction);
              }
            }
            return handle;
          };
          facade.InteractionManager = interactionManagerFacade;
        }
        return facade;
      }
    })();
    __graniteMicroFrontendGlobalNamesSnapshot = new Set(Object.getOwnPropertyNames(__graniteMicroFrontendHostGlobal));
    var __graniteMicroFrontendScopeTarget = Object.create(null);
    __graniteMicroFrontendScopeTarget.__GRANITE_MICRO_FRONTEND_SCOPED__ = true;
    __graniteMicroFrontendScopeTarget.__granite =
      __graniteMicroFrontendHostGlobal.__granite == null
        ? {}
        : Object.create(__graniteMicroFrontendHostGlobal.__granite);
    var __graniteMicroFrontendScopedGlobal;
    __graniteMicroFrontendScopedGlobal = new Proxy(__graniteMicroFrontendScopeTarget, {
      get: function(target, property, receiver) {
        if (property === "__MICRO_FRONTEND__") return __graniteMicroFrontendScopeContext;
        if (property === "global" || property === "globalThis" || property === "window" || property === "self") {
          return __graniteMicroFrontendScopedGlobal;
        }
        if (Reflect.has(target, property)) return Reflect.get(target, property, receiver);
        if (
          __graniteMicroFrontendScopedAmbient !== null &&
          typeof property === "string" &&
          __graniteMicroFrontendScopedAmbient[property] !== void 0
        ) {
          return __graniteMicroFrontendScopedAmbient[property];
        }
        return Reflect.get(__graniteMicroFrontendHostGlobal, property, receiver);
      },
      set: function(target, property, value, receiver) {
        return Reflect.set(target, property, value, receiver);
      },
      defineProperty: function(target, property, descriptor) {
        return Reflect.defineProperty(target, property, descriptor);
      },
      deleteProperty: function(target, property) {
        return Reflect.deleteProperty(target, property);
      },
      has: function(target, property) {
        return (
          property === "__MICRO_FRONTEND__" ||
          Reflect.has(target, property) ||
          Reflect.has(__graniteMicroFrontendHostGlobal, property)
        );
      }
    });
    var __graniteMicroFrontendRuntimeGlobal =
      globalOverride === void 0 ? __graniteMicroFrontendScopedGlobal : globalOverride;
    var __graniteMicroFrontendRuntimeGlobalThis =
      globalThisOverride === void 0 ? __graniteMicroFrontendRuntimeGlobal : globalThisOverride;
    var __graniteMicroFrontendRuntimeWindow =
      windowOverride === void 0 ? __graniteMicroFrontendRuntimeGlobal : windowOverride;
    var __graniteMicroFrontendRuntimeSelf =
      selfOverride === void 0 ? __graniteMicroFrontendRuntimeGlobal : selfOverride;

  var __graniteMicroFrontendEntryResult = (function ${factoryFunctionName}(global, globalThis, window, self, setTimeout, clearTimeout, setInterval, clearInterval, setImmediate, clearImmediate, requestAnimationFrame, cancelAnimationFrame, requestIdleCallback, cancelIdleCallback, queueMicrotask, fetch, XMLHttpRequest, WebSocket, ErrorUtils) {
"use strict";
`;
}

function getScopeFooter(options: ScopeBundleOptions) {
  const entryFunctionName = getEntryFunctionName(getScopedName(options));

  return `  }).call(
    __graniteMicroFrontendRuntimeGlobal,
    __graniteMicroFrontendRuntimeGlobal,
    __graniteMicroFrontendRuntimeGlobalThis,
    __graniteMicroFrontendRuntimeWindow,
    __graniteMicroFrontendRuntimeSelf,
    __graniteMicroFrontendScopedAmbient.setTimeout,
    __graniteMicroFrontendScopedAmbient.clearTimeout,
    __graniteMicroFrontendScopedAmbient.setInterval,
    __graniteMicroFrontendScopedAmbient.clearInterval,
    __graniteMicroFrontendScopedAmbient.setImmediate,
    __graniteMicroFrontendScopedAmbient.clearImmediate,
    __graniteMicroFrontendScopedAmbient.requestAnimationFrame,
    __graniteMicroFrontendScopedAmbient.cancelAnimationFrame,
    __graniteMicroFrontendScopedAmbient.requestIdleCallback,
    __graniteMicroFrontendScopedAmbient.cancelIdleCallback,
    __graniteMicroFrontendScopedAmbient.queueMicrotask,
    __graniteMicroFrontendScopedAmbient.fetch,
    __graniteMicroFrontendScopedAmbient.XMLHttpRequest,
    __graniteMicroFrontendScopedAmbient.WebSocket,
    __graniteMicroFrontendScopedAmbient.ErrorUtils
  );

  var __graniteMicroFrontendScopes = global.${SCOPE_REGISTRY_PROPERTY};
  if (__graniteMicroFrontendScopes == null) {
    __graniteMicroFrontendScopes = Object.create(null);
    Object.defineProperty(global, "${SCOPE_REGISTRY_PROPERTY}", {
      value: __graniteMicroFrontendScopes,
      configurable: true
    });
  }
  __graniteMicroFrontendScopes[${JSON.stringify(options.appName)}] = __graniteMicroFrontendScopeContext;
  return __graniteMicroFrontendEntryResult;
}

var __graniteMicroFrontendEntries = global.${ENTRY_REGISTRY_PROPERTY};
if (__graniteMicroFrontendEntries == null) {
  __graniteMicroFrontendEntries = Object.create(null);
  Object.defineProperty(global, "${ENTRY_REGISTRY_PROPERTY}", {
    value: __graniteMicroFrontendEntries,
    configurable: true
  });
}
__graniteMicroFrontendEntries[${JSON.stringify(options.appName)}] = ${entryFunctionName};`;
}

function getScopedName(options: ScopeBundleOptions) {
  return `${options.appName}_${options.name}`;
}

function getEntryFunctionName(name: string) {
  return `__graniteMicroFrontendRemoteEntry_${toIdentifierSuffix(name)}`;
}

function getFactoryFunctionName(name: string) {
  return `__graniteMicroFrontendRemoteFactory_${toIdentifierSuffix(name)}`;
}

function toIdentifierSuffix(value: string) {
  const suffix = value.replace(/[^0-9A-Za-z_$]/g, '_');
  const hashSuffix = getStableIdentifierHash(value);
  const safeSuffix = suffix.length === 0 ? '_' : suffix;
  const identifierSuffix = /^[A-Za-z_$]/.test(safeSuffix) ? safeSuffix : `_${safeSuffix}`;

  return `${identifierSuffix}_${hashSuffix}`;
}

function getStableIdentifierHash(value: string) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}
