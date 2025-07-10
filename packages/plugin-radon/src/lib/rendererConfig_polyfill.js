var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// react-devtools-shared/src/BridgelessUIManager.js
var require_BridgelessUIManager = __commonJS({
  "react-devtools-shared/src/BridgelessUIManager.js"(exports, module) {
    var componentNameToExists = /* @__PURE__ */ new Map();
    function unstable_hasComponent(name) {
      let hasNativeComponent = componentNameToExists.get(name);
      if (hasNativeComponent == null) {
        if (globalThis.__nativeComponentRegistry__hasComponent) {
          hasNativeComponent = globalThis.__nativeComponentRegistry__hasComponent(name);
          componentNameToExists.set(name, hasNativeComponent);
        } else {
          throw `unstable_hasComponent('${name}'): Global function is not registered`;
        }
      }
      return hasNativeComponent;
    }
    var errorMessageForMethod = (methodName) => "[ReactNative Architecture][JS] '" + methodName + "' is not available in the new React Native architecture.";
    module.exports = {
      getViewManagerConfig: (viewManagerName) => {
        console.error(
          errorMessageForMethod("getViewManagerConfig") + "Use hasViewManagerConfig instead. viewManagerName: " + viewManagerName
        );
        return null;
      },
      hasViewManagerConfig: (viewManagerName) => {
        return unstable_hasComponent(viewManagerName);
      },
      getConstants: () => {
        console.error(errorMessageForMethod("getConstants"));
        return {};
      },
      getConstantsForViewManager: (viewManagerName) => {
        console.error(errorMessageForMethod("getConstantsForViewManager"));
        return {};
      },
      getDefaultEventTypes: () => {
        console.error(errorMessageForMethod("getDefaultEventTypes"));
        return [];
      },
      lazilyLoadView: (name) => {
        console.error(errorMessageForMethod("lazilyLoadView"));
        return {};
      },
      createView: (reactTag, viewName, rootTag, props) => console.error(errorMessageForMethod("createView")),
      updateView: (reactTag, viewName, props) => console.error(errorMessageForMethod("updateView")),
      focus: (reactTag) => console.error(errorMessageForMethod("focus")),
      blur: (reactTag) => console.error(errorMessageForMethod("blur")),
      findSubviewIn: (reactTag, point, callback) => console.error(errorMessageForMethod("findSubviewIn")),
      dispatchViewManagerCommand: (reactTag, commandID, commandArgs) => console.error(errorMessageForMethod("dispatchViewManagerCommand")),
      measure: (reactTag, callback) => console.error(errorMessageForMethod("measure")),
      measureInWindow: (reactTag, callback) => console.error(errorMessageForMethod("measureInWindow")),
      viewIsDescendantOf: (reactTag, ancestorReactTag, callback) => console.error(errorMessageForMethod("viewIsDescendantOf")),
      measureLayout: (reactTag, ancestorReactTag, errorCallback, callback) => console.error(errorMessageForMethod("measureLayout")),
      measureLayoutRelativeToParent: (reactTag, errorCallback, callback) => console.error(errorMessageForMethod("measureLayoutRelativeToParent")),
      setJSResponder: (reactTag, blockNativeResponder) => console.error(errorMessageForMethod("setJSResponder")),
      clearJSResponder: () => {
      },
      // Don't log error here because we're aware it gets called
      configureNextLayoutAnimation: (config, callback, errorCallback) => console.error(errorMessageForMethod("configureNextLayoutAnimation")),
      removeSubviewsFromContainerWithID: (containerID) => console.error(errorMessageForMethod("removeSubviewsFromContainerWithID")),
      replaceExistingNonRootView: (reactTag, newReactTag) => console.error(errorMessageForMethod("replaceExistingNonRootView")),
      setChildren: (containerTag, reactTags) => console.error(errorMessageForMethod("setChildren")),
      manageChildren: (containerTag, moveFromIndices, moveToIndices, addChildReactTags, addAtIndices, removeAtIndices) => console.error(errorMessageForMethod("manageChildren")),
      // Android only
      setLayoutAnimationEnabledExperimental: (enabled) => {
        console.error(
          errorMessageForMethod("setLayoutAnimationEnabledExperimental")
        );
      },
      // Please use AccessibilityInfo.sendAccessibilityEvent instead.
      // See SetAccessibilityFocusExample in AccessibilityExample.js for a migration example.
      sendAccessibilityEvent: (reactTag, eventType) => console.error(errorMessageForMethod("sendAccessibilityEvent")),
      showPopupMenu: (reactTag, items, error, success) => console.error(errorMessageForMethod("showPopupMenu")),
      dismissPopupMenu: () => console.error(errorMessageForMethod("dismissPopupMenu"))
    };
  }
});

// react-native-modules/node_modules/invariant/browser.js
var require_browser = __commonJS({
  "react-native-modules/node_modules/invariant/browser.js"(exports, module) {
    "use strict";
    var invariant3 = function(condition, format, a, b, c, d, e, f) {
      if (true) {
        if (format === void 0) {
          throw new Error("invariant requires an error message argument");
        }
      }
      if (!condition) {
        var error;
        if (format === void 0) {
          error = new Error(
            "Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings."
          );
        } else {
          var args = [a, b, c, d, e, f];
          var argIndex = 0;
          error = new Error(
            format.replace(/%s/g, function() {
              return args[argIndex++];
            })
          );
          error.name = "Invariant Violation";
        }
        error.framesToPop = 1;
        throw error;
      }
    };
    module.exports = invariant3;
  }
});

// react-native-modules/Libraries/Performance/Systrace.js
var Systrace_exports = {};
__export(Systrace_exports, {
  beginAsyncEvent: () => beginAsyncEvent,
  beginEvent: () => beginEvent,
  counterEvent: () => counterEvent,
  endAsyncEvent: () => endAsyncEvent,
  endEvent: () => endEvent,
  isEnabled: () => isEnabled,
  setEnabled: () => setEnabled
});
function isEnabled() {
  return globalThis.nativeTraceIsTracing ? globalThis.nativeTraceIsTracing(TRACE_TAG_REACT_APPS) : Boolean(globalThis.__RCTProfileIsProfiling);
}
function setEnabled(_doEnable) {
}
function beginEvent(eventName, args) {
  if (isEnabled()) {
    const eventNameString = typeof eventName === "function" ? eventName() : eventName;
    globalThis.nativeTraceBeginSection(TRACE_TAG_REACT_APPS, eventNameString, args);
  }
}
function endEvent(args) {
  if (isEnabled()) {
    globalThis.nativeTraceEndSection(TRACE_TAG_REACT_APPS, args);
  }
}
function beginAsyncEvent(eventName, args) {
  const cookie = _asyncCookie;
  if (isEnabled()) {
    _asyncCookie++;
    const eventNameString = typeof eventName === "function" ? eventName() : eventName;
    globalThis.nativeTraceBeginAsyncSection(
      TRACE_TAG_REACT_APPS,
      eventNameString,
      cookie,
      args
    );
  }
  return cookie;
}
function endAsyncEvent(eventName, cookie, args) {
  if (isEnabled()) {
    const eventNameString = typeof eventName === "function" ? eventName() : eventName;
    globalThis.nativeTraceEndAsyncSection(
      TRACE_TAG_REACT_APPS,
      eventNameString,
      cookie,
      args
    );
  }
}
function counterEvent(eventName, value) {
  if (isEnabled()) {
    const eventNameString = typeof eventName === "function" ? eventName() : eventName;
    globalThis.nativeTraceCounter && globalThis.nativeTraceCounter(TRACE_TAG_REACT_APPS, eventNameString, value);
  }
}
var TRACE_TAG_REACT_APPS, _asyncCookie;
var init_Systrace = __esm({
  "react-native-modules/Libraries/Performance/Systrace.js"() {
    TRACE_TAG_REACT_APPS = 1 << 17;
    _asyncCookie = 0;
    if (true) {
      const Systrace = {
        isEnabled,
        setEnabled,
        beginEvent,
        endEvent,
        beginAsyncEvent,
        endAsyncEvent,
        counterEvent
      };
      globalThis[(globalThis.__METRO_GLOBAL_PREFIX__ || "") + "__SYSTRACE"] = Systrace;
    }
  }
});

// react-native-modules/Libraries/Utilities/deepFreezeAndThrowOnMutationInDev.js
var require_deepFreezeAndThrowOnMutationInDev = __commonJS({
  "react-native-modules/Libraries/Utilities/deepFreezeAndThrowOnMutationInDev.js"(exports, module) {
    "use strict";
    function deepFreezeAndThrowOnMutationInDev(object) {
      if (true) {
        if (typeof object !== "object" || object === null || Object.isFrozen(object) || Object.isSealed(object)) {
          return object;
        }
        const keys = Object.keys(object);
        const hasOwnProperty = Object.prototype.hasOwnProperty;
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (hasOwnProperty.call(object, key)) {
            Object.defineProperty(object, key, {
              get: identity.bind(null, object[key])
            });
            Object.defineProperty(object, key, {
              set: throwOnImmutableMutation.bind(null, key)
            });
          }
        }
        Object.freeze(object);
        Object.seal(object);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (hasOwnProperty.call(object, key)) {
            deepFreezeAndThrowOnMutationInDev(object[key]);
          }
        }
      }
      return object;
    }
    function throwOnImmutableMutation(key, value) {
      throw Error(
        "You attempted to set the key `" + key + "` with the value `" + JSON.stringify(value) + "` on an object that is meant to be immutable and has been frozen."
      );
    }
    function identity(value) {
      return value;
    }
    module.exports = deepFreezeAndThrowOnMutationInDev;
  }
});

// react-native-modules/Libraries/Utilities/stringifySafe.js
var stringifySafe_exports = {};
__export(stringifySafe_exports, {
  createStringifySafeWithLimits: () => createStringifySafeWithLimits,
  default: () => stringifySafe_default
});
function createStringifySafeWithLimits(limits) {
  const {
    maxDepth = Number.POSITIVE_INFINITY,
    maxStringLimit = Number.POSITIVE_INFINITY,
    maxArrayLimit = Number.POSITIVE_INFINITY,
    maxObjectKeysLimit = Number.POSITIVE_INFINITY
  } = limits;
  const stack = [];
  function replacer(key, value) {
    while (stack.length && this !== stack[0]) {
      stack.shift();
    }
    if (typeof value === "string") {
      const truncatedString = "...(truncated)...";
      if (value.length > maxStringLimit + truncatedString.length) {
        return value.substring(0, maxStringLimit) + truncatedString;
      }
      return value;
    }
    if (typeof value !== "object" || value === null) {
      return value;
    }
    let retval = value;
    if (Array.isArray(value)) {
      if (stack.length >= maxDepth) {
        retval = `[ ... array with ${value.length} values ... ]`;
      } else if (value.length > maxArrayLimit) {
        retval = value.slice(0, maxArrayLimit).concat([
          `... extra ${value.length - maxArrayLimit} values truncated ...`
        ]);
      }
    } else {
      (0, import_invariant.default)(typeof value === "object", "This was already found earlier");
      let keys = Object.keys(value);
      if (stack.length >= maxDepth) {
        retval = `{ ... object with ${keys.length} keys ... }`;
      } else if (keys.length > maxObjectKeysLimit) {
        retval = {};
        for (let k of keys.slice(0, maxObjectKeysLimit)) {
          retval[k] = value[k];
        }
        const truncatedKey = "...(truncated keys)...";
        retval[truncatedKey] = keys.length - maxObjectKeysLimit;
      }
    }
    stack.unshift(retval);
    return retval;
  }
  return function stringifySafe2(arg) {
    if (arg === void 0) {
      return "undefined";
    } else if (arg === null) {
      return "null";
    } else if (typeof arg === "function") {
      try {
        return arg.toString();
      } catch (e) {
        return "[function unknown]";
      }
    } else if (arg instanceof Error) {
      return arg.name + ": " + arg.message;
    } else {
      try {
        const ret = JSON.stringify(arg, replacer);
        if (ret === void 0) {
          return '["' + typeof arg + '" failed to stringify]';
        }
        return ret;
      } catch (e) {
        if (typeof arg.toString === "function") {
          try {
            return arg.toString();
          } catch (E) {
          }
        }
      }
    }
    return '["' + typeof arg + '" failed to stringify]';
  };
}
var import_invariant, stringifySafe, stringifySafe_default;
var init_stringifySafe = __esm({
  "react-native-modules/Libraries/Utilities/stringifySafe.js"() {
    import_invariant = __toESM(require_browser());
    stringifySafe = createStringifySafeWithLimits({
      maxDepth: 10,
      maxStringLimit: 100,
      maxArrayLimit: 50,
      maxObjectKeysLimit: 50
    });
    stringifySafe_default = stringifySafe;
  }
});

// react-native-modules/Libraries/Utilities/warnOnce.js
var require_warnOnce = __commonJS({
  "react-native-modules/Libraries/Utilities/warnOnce.js"(exports, module) {
    "use strict";
    var warnedKeys = {};
    function warnOnce(key, message) {
      if (warnedKeys[key]) {
        return;
      }
      console.warn(message);
      warnedKeys[key] = true;
    }
    module.exports = warnOnce;
  }
});

// react-native-modules/Libraries/vendor/core/ErrorUtils.js
var require_ErrorUtils = __commonJS({
  "react-native-modules/Libraries/vendor/core/ErrorUtils.js"(exports, module) {
    module.exports = globalThis.ErrorUtils;
  }
});

// react-native-modules/Libraries/BatchedBridge/MessageQueue.js
var require_MessageQueue = __commonJS({
  "react-native-modules/Libraries/BatchedBridge/MessageQueue.js"(exports, module) {
    "use strict";
    var Systrace = (init_Systrace(), __toCommonJS(Systrace_exports));
    var deepFreezeAndThrowOnMutationInDev = require_deepFreezeAndThrowOnMutationInDev();
    var stringifySafe2 = (init_stringifySafe(), __toCommonJS(stringifySafe_exports)).default;
    var warnOnce = require_warnOnce();
    var ErrorUtils = require_ErrorUtils();
    var invariant3 = require_browser();
    var TO_JS = 0;
    var TO_NATIVE = 1;
    var MODULE_IDS = 0;
    var METHOD_IDS = 1;
    var PARAMS = 2;
    var MIN_TIME_BETWEEN_FLUSHES_MS = 5;
    var TRACE_TAG_REACT_APPS2 = 1 << 17;
    var DEBUG_INFO_LIMIT = 32;
    var MessageQueue = class _MessageQueue {
      constructor() {
        this._lazyCallableModules = {};
        this._queue = [[], [], [], 0];
        this._successCallbacks = /* @__PURE__ */ new Map();
        this._failureCallbacks = /* @__PURE__ */ new Map();
        this._callID = 0;
        this._lastFlush = 0;
        this._eventLoopStartTime = Date.now();
        this._reactNativeMicrotasksCallback = null;
        if (true) {
          this._debugInfo = {};
          this._remoteModuleTable = {};
          this._remoteMethodTable = {};
        }
        this.callFunctionReturnFlushedQueue = // $FlowFixMe[method-unbinding] added when improving typing for this parameters
        this.callFunctionReturnFlushedQueue.bind(this);
        this.flushedQueue = this.flushedQueue.bind(this);
        this.invokeCallbackAndReturnFlushedQueue = // $FlowFixMe[method-unbinding] added when improving typing for this parameters
        this.invokeCallbackAndReturnFlushedQueue.bind(this);
      }
      /**
       * Public APIs
       */
      static spy(spyOrToggle) {
        if (spyOrToggle === true) {
          _MessageQueue.prototype.__spy = (info) => {
            console.log(
              `${info.type === TO_JS ? "N->JS" : "JS->N"} : ${info.module != null ? info.module + "." : ""}${info.method}(${JSON.stringify(info.args)})`
            );
          };
        } else if (spyOrToggle === false) {
          _MessageQueue.prototype.__spy = null;
        } else {
          _MessageQueue.prototype.__spy = spyOrToggle;
        }
      }
      callFunctionReturnFlushedQueue(module2, method, args) {
        this.__guard(() => {
          this.__callFunction(module2, method, args);
        });
        return this.flushedQueue();
      }
      invokeCallbackAndReturnFlushedQueue(cbID, args) {
        this.__guard(() => {
          this.__invokeCallback(cbID, args);
        });
        return this.flushedQueue();
      }
      flushedQueue() {
        this.__guard(() => {
          this.__callReactNativeMicrotasks();
        });
        const queue = this._queue;
        this._queue = [[], [], [], this._callID];
        return queue[0].length ? queue : null;
      }
      getEventLoopRunningTime() {
        return Date.now() - this._eventLoopStartTime;
      }
      registerCallableModule(name, module2) {
        this._lazyCallableModules[name] = () => module2;
      }
      registerLazyCallableModule(name, factory) {
        let module2;
        let getValue = factory;
        this._lazyCallableModules[name] = () => {
          if (getValue) {
            module2 = getValue();
            getValue = null;
          }
          return module2;
        };
      }
      getCallableModule(name) {
        const getValue = this._lazyCallableModules[name];
        return getValue ? getValue() : null;
      }
      callNativeSyncHook(moduleID, methodID, params, onFail, onSucc) {
        if (true) {
          invariant3(
            globalThis.nativeCallSyncHook,
            "Calling synchronous methods on native modules is not supported in Chrome.\n\n Consider providing alternative methods to expose this method in debug mode, e.g. by exposing constants ahead-of-time."
          );
        }
        this.processCallbacks(moduleID, methodID, params, onFail, onSucc);
        return globalThis.nativeCallSyncHook(moduleID, methodID, params);
      }
      processCallbacks(moduleID, methodID, params, onFail, onSucc) {
        if (onFail || onSucc) {
          if (true) {
            this._debugInfo[this._callID] = [moduleID, methodID];
            if (this._callID > DEBUG_INFO_LIMIT) {
              delete this._debugInfo[this._callID - DEBUG_INFO_LIMIT];
            }
            if (this._successCallbacks.size > 500) {
              const info = {};
              this._successCallbacks.forEach((_, callID) => {
                const debug = this._debugInfo[callID];
                const module2 = debug && this._remoteModuleTable[debug[0]];
                const method = debug && this._remoteMethodTable[debug[0]][debug[1]];
                info[callID] = { module: module2, method };
              });
              warnOnce(
                "excessive-number-of-pending-callbacks",
                `Excessive number of pending callbacks: ${this._successCallbacks.size}. Some pending callbacks that might have leaked by never being called from native code: ${stringifySafe2(
                  info
                )}`
              );
            }
          }
          onFail && params.push(this._callID << 1);
          onSucc && params.push(this._callID << 1 | 1);
          this._successCallbacks.set(this._callID, onSucc);
          this._failureCallbacks.set(this._callID, onFail);
        }
        if (true) {
          globalThis.nativeTraceBeginAsyncFlow && globalThis.nativeTraceBeginAsyncFlow(
            TRACE_TAG_REACT_APPS2,
            "native",
            this._callID
          );
        }
        this._callID++;
      }
      enqueueNativeCall(moduleID, methodID, params, onFail, onSucc) {
        this.processCallbacks(moduleID, methodID, params, onFail, onSucc);
        this._queue[MODULE_IDS].push(moduleID);
        this._queue[METHOD_IDS].push(methodID);
        if (true) {
          const isValidArgument = (val) => {
            switch (typeof val) {
              case "undefined":
              case "boolean":
              case "string":
                return true;
              case "number":
                return isFinite(val);
              case "object":
                if (val == null) {
                  return true;
                }
                if (Array.isArray(val)) {
                  return val.every(isValidArgument);
                }
                for (const k in val) {
                  if (typeof val[k] !== "function" && !isValidArgument(val[k])) {
                    return false;
                  }
                }
                return true;
              case "function":
                return false;
              default:
                return false;
            }
          };
          const replacer = (key, val) => {
            const t = typeof val;
            if (t === "function") {
              return "<<Function " + val.name + ">>";
            } else if (t === "number" && !isFinite(val)) {
              return "<<" + val.toString() + ">>";
            } else {
              return val;
            }
          };
          invariant3(
            isValidArgument(params),
            "%s is not usable as a native method argument",
            JSON.stringify(params, replacer)
          );
          deepFreezeAndThrowOnMutationInDev(params);
        }
        this._queue[PARAMS].push(params);
        const now = Date.now();
        if (globalThis.nativeFlushQueueImmediate && now - this._lastFlush >= MIN_TIME_BETWEEN_FLUSHES_MS) {
          const queue = this._queue;
          this._queue = [[], [], [], this._callID];
          this._lastFlush = now;
          globalThis.nativeFlushQueueImmediate(queue);
        }
        Systrace.counterEvent("pending_js_to_native_queue", this._queue[0].length);
        if (this.__spy && isFinite(moduleID)) {
          this.__spy({
            type: TO_NATIVE,
            module: this._remoteModuleTable[moduleID],
            method: this._remoteMethodTable[moduleID][methodID],
            args: params
          });
        } else if (this.__spy) {
          this.__spy({
            type: TO_NATIVE,
            module: moduleID + "",
            method: methodID,
            args: params
          });
        }
      }
      createDebugLookup(moduleID, name, methods) {
        if (true) {
          this._remoteModuleTable[moduleID] = name;
          this._remoteMethodTable[moduleID] = methods || [];
        }
      }
      // For JSTimers to register its callback. Otherwise a circular dependency
      // between modules is introduced. Note that only one callback may be
      // registered at a time.
      setReactNativeMicrotasksCallback(fn) {
        this._reactNativeMicrotasksCallback = fn;
      }
      /**
       * Private methods
       */
      __guard(fn) {
        if (this.__shouldPauseOnThrow()) {
          fn();
        } else {
          try {
            fn();
          } catch (error) {
            ErrorUtils.reportFatalError(error);
          }
        }
      }
      // MessageQueue installs a global handler to catch all exceptions where JS users can register their own behavior
      // This handler makes all exceptions to be propagated from inside MessageQueue rather than by the VM at their origin
      // This makes stacktraces to be placed at MessageQueue rather than at where they were launched
      // The parameter DebuggerInternal.shouldPauseOnThrow is used to check before catching all exceptions and
      // can be configured by the VM or any Inspector
      __shouldPauseOnThrow() {
        return (
          // $FlowFixMe[cannot-resolve-name]
          typeof DebuggerInternal !== "undefined" && // $FlowFixMe[cannot-resolve-name]
          DebuggerInternal.shouldPauseOnThrow === true
        );
      }
      __callReactNativeMicrotasks() {
        Systrace.beginEvent("JSTimers.callReactNativeMicrotasks()");
        if (this._reactNativeMicrotasksCallback != null) {
          this._reactNativeMicrotasksCallback();
        }
        Systrace.endEvent();
      }
      __callFunction(module2, method, args) {
        this._lastFlush = Date.now();
        this._eventLoopStartTime = this._lastFlush;
        if (true) {
          Systrace.beginEvent(`${module2}.${method}(${stringifySafe2(args)})`);
        } else {
          Systrace.beginEvent(`${module2}.${method}(...)`);
        }
        if (this.__spy) {
          this.__spy({ type: TO_JS, module: module2, method, args });
        }
        const moduleMethods = this.getCallableModule(module2);
        if (!moduleMethods) {
          const callableModuleNames = Object.keys(this._lazyCallableModules);
          const n = callableModuleNames.length;
          const callableModuleNameList = callableModuleNames.join(", ");
          const isBridgelessMode = globalThis.RN$Bridgeless === true ? "true" : "false";
          invariant3(
            false,
            `Failed to call into JavaScript module method ${module2}.${method}(). Module has not been registered as callable. Bridgeless Mode: ${isBridgelessMode}. Registered callable JavaScript modules (n = ${n}): ${callableModuleNameList}.
        A frequent cause of the error is that the application entry file path is incorrect. This can also happen when the JS bundle is corrupt or there is an early initialization error when loading React Native.`
          );
        }
        if (!moduleMethods[method]) {
          invariant3(
            false,
            `Failed to call into JavaScript module method ${module2}.${method}(). Module exists, but the method is undefined.`
          );
        }
        moduleMethods[method].apply(moduleMethods, args);
        Systrace.endEvent();
      }
      __invokeCallback(cbID, args) {
        this._lastFlush = Date.now();
        this._eventLoopStartTime = this._lastFlush;
        const callID = cbID >>> 1;
        const isSuccess = cbID & 1;
        const callback = isSuccess ? this._successCallbacks.get(callID) : this._failureCallbacks.get(callID);
        if (true) {
          const debug = this._debugInfo[callID];
          const module2 = debug && this._remoteModuleTable[debug[0]];
          const method = debug && this._remoteMethodTable[debug[0]][debug[1]];
          invariant3(
            callback,
            `No callback found with cbID ${cbID} and callID ${callID} for ` + (method ? ` ${module2}.${method} - most likely the callback was already invoked` : `module ${module2 || "<unknown>"}`) + `. Args: '${stringifySafe2(args)}'`
          );
          const profileName = debug ? "<callback for " + module2 + "." + method + ">" : cbID;
          if (callback && this.__spy) {
            this.__spy({ type: TO_JS, module: null, method: profileName, args });
          }
          Systrace.beginEvent(
            `MessageQueue.invokeCallback(${profileName}, ${stringifySafe2(args)})`
          );
        }
        if (!callback) {
          return;
        }
        this._successCallbacks.delete(callID);
        this._failureCallbacks.delete(callID);
        callback(...args);
        if (true) {
          Systrace.endEvent();
        }
      }
    };
    module.exports = MessageQueue;
  }
});

// react-native-modules/Libraries/BatchedBridge/BatchedBridge.js
var require_BatchedBridge = __commonJS({
  "react-native-modules/Libraries/BatchedBridge/BatchedBridge.js"(exports, module) {
    "use strict";
    var MessageQueue = require_MessageQueue();
    var BatchedBridge = new MessageQueue();
    Object.defineProperty(globalThis, "__fbBatchedBridge", {
      configurable: true,
      value: BatchedBridge
    });
    module.exports = BatchedBridge;
  }
});

// react-native-modules/Libraries/Utilities/defineLazyObjectProperty.js
var require_defineLazyObjectProperty = __commonJS({
  "react-native-modules/Libraries/Utilities/defineLazyObjectProperty.js"(exports, module) {
    "use strict";
    function defineLazyObjectProperty(object, name, descriptor) {
      const { get } = descriptor;
      const enumerable = descriptor.enumerable !== false;
      const writable = descriptor.writable !== false;
      let value;
      let valueSet = false;
      function getValue() {
        if (!valueSet) {
          valueSet = true;
          setValue(get());
        }
        return value;
      }
      function setValue(newValue) {
        value = newValue;
        valueSet = true;
        Object.defineProperty(object, name, {
          value: newValue,
          configurable: true,
          enumerable,
          writable
        });
      }
      Object.defineProperty(object, name, {
        get: getValue,
        set: setValue,
        configurable: true,
        enumerable
      });
    }
    module.exports = defineLazyObjectProperty;
  }
});

// react-native-modules/Libraries/BatchedBridge/NativeModules.js
var require_NativeModules = __commonJS({
  "react-native-modules/Libraries/BatchedBridge/NativeModules.js"(exports, module) {
    "use strict";
    var BatchedBridge = require_BatchedBridge();
    var invariant3 = require_browser();
    function genModule(config, moduleID) {
      if (!config) {
        return null;
      }
      const [moduleName, constants, methods, promiseMethods, syncMethods] = config;
      invariant3(
        !moduleName.startsWith("RCT") && !moduleName.startsWith("RK"),
        "Module name prefixes should've been stripped by the native side but wasn't for " + moduleName
      );
      if (!constants && !methods) {
        return { name: moduleName };
      }
      const module2 = {};
      methods && methods.forEach((methodName, methodID) => {
        const isPromise = promiseMethods && arrayContains(promiseMethods, methodID) || false;
        const isSync = syncMethods && arrayContains(syncMethods, methodID) || false;
        invariant3(
          !isPromise || !isSync,
          "Cannot have a method that is both async and a sync hook"
        );
        const methodType = isPromise ? "promise" : isSync ? "sync" : "async";
        module2[methodName] = genMethod(moduleID, methodID, methodType);
      });
      Object.assign(module2, constants);
      if (module2.getConstants == null) {
        module2.getConstants = () => constants || Object.freeze({});
      } else {
        console.warn(
          `Unable to define method 'getConstants()' on NativeModule '${moduleName}'. NativeModule '${moduleName}' already has a constant or method called 'getConstants'. Please remove it.`
        );
      }
      if (true) {
        BatchedBridge.createDebugLookup(moduleID, moduleName, methods);
      }
      return { name: moduleName, module: module2 };
    }
    globalThis.__fbGenNativeModule = genModule;
    function loadModule(name, moduleID) {
      invariant3(
        globalThis.nativeRequireModuleConfig,
        "Can't lazily create module without nativeRequireModuleConfig"
      );
      const config = globalThis.nativeRequireModuleConfig(name);
      const info = genModule(config, moduleID);
      return info && info.module;
    }
    function genMethod(moduleID, methodID, type) {
      let fn = null;
      if (type === "promise") {
        fn = function promiseMethodWrapper(...args) {
          const enqueueingFrameError = new Error();
          return new Promise((resolve, reject) => {
            BatchedBridge.enqueueNativeCall(
              moduleID,
              methodID,
              args,
              (data) => resolve(data),
              (errorData) => reject(
                updateErrorWithErrorData(
                  errorData,
                  enqueueingFrameError
                )
              )
            );
          });
        };
      } else {
        fn = function nonPromiseMethodWrapper(...args) {
          const lastArg = args.length > 0 ? args[args.length - 1] : null;
          const secondLastArg = args.length > 1 ? args[args.length - 2] : null;
          const hasSuccessCallback = typeof lastArg === "function";
          const hasErrorCallback = typeof secondLastArg === "function";
          hasErrorCallback && invariant3(
            hasSuccessCallback,
            "Cannot have a non-function arg after a function arg."
          );
          const onSuccess = hasSuccessCallback ? lastArg : null;
          const onFail = hasErrorCallback ? secondLastArg : null;
          const callbackCount = hasSuccessCallback + hasErrorCallback;
          const newArgs = args.slice(0, args.length - callbackCount);
          if (type === "sync") {
            return BatchedBridge.callNativeSyncHook(
              moduleID,
              methodID,
              newArgs,
              onFail,
              onSuccess
            );
          } else {
            BatchedBridge.enqueueNativeCall(
              moduleID,
              methodID,
              newArgs,
              onFail,
              onSuccess
            );
          }
        };
      }
      fn.type = type;
      return fn;
    }
    function arrayContains(array, value) {
      return array.indexOf(value) !== -1;
    }
    function updateErrorWithErrorData(errorData, error) {
      return Object.assign(error, errorData || {});
    }
    var NativeModules2 = {};
    if (globalThis.nativeModuleProxy) {
      NativeModules2 = globalThis.nativeModuleProxy;
    } else if (!globalThis.nativeExtensions) {
      const bridgeConfig = globalThis.__fbBatchedBridgeConfig;
      invariant3(
        bridgeConfig,
        "__fbBatchedBridgeConfig is not set, cannot invoke native modules"
      );
      const defineLazyObjectProperty = require_defineLazyObjectProperty();
      (bridgeConfig.remoteModuleConfig || []).forEach(
        (config, moduleID) => {
          const info = genModule(config, moduleID);
          if (!info) {
            return;
          }
          if (info.module) {
            NativeModules2[info.name] = info.module;
          } else {
            defineLazyObjectProperty(NativeModules2, info.name, {
              get: () => loadModule(info.name, moduleID)
            });
          }
        }
      );
    }
    module.exports = NativeModules2;
  }
});

// react-native-modules/Libraries/TurboModule/TurboModuleRegistry.js
function requireModule(name) {
  if (globalThis.RN$Bridgeless !== true) {
    const legacyModule = NativeModules[name];
    if (legacyModule != null) {
      return legacyModule;
    }
  }
  if (turboModuleProxy != null) {
    const module = turboModuleProxy(name);
    return module;
  }
  return null;
}
function getEnforcing(name) {
  const module = requireModule(name);
  (0, import_invariant2.default)(
    module != null,
    `TurboModuleRegistry.getEnforcing(...): '${name}' could not be found. Verify that a module by this name is registered in the native binary.`
  );
  return module;
}
var import_invariant2, NativeModules, turboModuleProxy;
var init_TurboModuleRegistry = __esm({
  "react-native-modules/Libraries/TurboModule/TurboModuleRegistry.js"() {
    import_invariant2 = __toESM(require_browser());
    NativeModules = require_NativeModules();
    turboModuleProxy = globalThis.__turboModuleProxy;
  }
});

// react-native-modules/Libraries/ReactNative/NativeUIManager.js
var NativeUIManager_default;
var init_NativeUIManager = __esm({
  "react-native-modules/Libraries/ReactNative/NativeUIManager.js"() {
    init_TurboModuleRegistry();
    NativeUIManager_default = getEnforcing("UIManager");
  }
});

// react-devtools-shared/src/PaperUIManager.js
var require_PaperUIManager = __commonJS({
  "react-devtools-shared/src/PaperUIManager.js"(exports, module) {
    init_NativeUIManager();
    var NativeModules2 = require_NativeModules();
    var defineLazyObjectProperty = require_defineLazyObjectProperty();
    var Platform = {
      OS: "ios"
    };
    var UIManagerProperties = [
      "clearJSResponder",
      "configureNextLayoutAnimation",
      "createView",
      "dismissPopupMenu",
      "dispatchViewManagerCommand",
      "findSubviewIn",
      "getConstantsForViewManager",
      "getDefaultEventTypes",
      "manageChildren",
      "measure",
      "measureInWindow",
      "measureLayout",
      "measureLayoutRelativeToParent",
      "removeRootView",
      "removeSubviewsFromContainerWithID",
      "replaceExistingNonRootView",
      "sendAccessibilityEvent",
      "setChildren",
      "setJSResponder",
      "setLayoutAnimationEnabledExperimental",
      "showPopupMenu",
      "updateView",
      "viewIsDescendantOf",
      "PopupMenu",
      "LazyViewManagersEnabled",
      "ViewManagerNames",
      "StyleConstants",
      "AccessibilityEventTypes",
      "UIView",
      "getViewManagerConfig",
      "hasViewManagerConfig",
      "blur",
      "focus",
      "genericBubblingEventTypes",
      "genericDirectEventTypes",
      "lazilyLoadView"
    ];
    var viewManagerConfigs = {};
    var triedLoadingConfig = /* @__PURE__ */ new Set();
    var NativeUIManagerConstants = {};
    var isNativeUIManagerConstantsSet = false;
    function getConstants() {
      if (!isNativeUIManagerConstantsSet) {
        NativeUIManagerConstants = NativeUIManager_default.getConstants();
        isNativeUIManagerConstantsSet = true;
      }
      return NativeUIManagerConstants;
    }
    function getViewManagerConfig(viewManagerName) {
      if (viewManagerConfigs[viewManagerName] === void 0 && globalThis.nativeCallSyncHook && // If we're in the Chrome Debugger, let's not even try calling the sync method
      NativeUIManager_default.getConstantsForViewManager) {
        try {
          viewManagerConfigs[viewManagerName] = NativeUIManager_default.getConstantsForViewManager(viewManagerName);
        } catch (e) {
          console.error(
            "NativeUIManager.getConstantsForViewManager('" + viewManagerName + "') threw an exception.",
            e
          );
          viewManagerConfigs[viewManagerName] = null;
        }
      }
      const config = viewManagerConfigs[viewManagerName];
      if (config) {
        return config;
      }
      if (!globalThis.nativeCallSyncHook) {
        return config;
      }
      if (NativeUIManager_default.lazilyLoadView && !triedLoadingConfig.has(viewManagerName)) {
        const result = NativeUIManager_default.lazilyLoadView(viewManagerName);
        triedLoadingConfig.add(viewManagerName);
        if (result != null && result.viewConfig != null) {
          getConstants()[viewManagerName] = result.viewConfig;
          lazifyViewManagerConfig(viewManagerName);
        }
      }
      return viewManagerConfigs[viewManagerName];
    }
    var UIManagerJS = {
      ...NativeUIManager_default,
      createView(reactTag, viewName, rootTag, props) {
        if (Platform.OS === "ios" && viewManagerConfigs[viewName] === void 0) {
          getViewManagerConfig(viewName);
        }
        NativeUIManager_default.createView(reactTag, viewName, rootTag, props);
      },
      getConstants() {
        return getConstants();
      },
      getViewManagerConfig(viewManagerName) {
        return getViewManagerConfig(viewManagerName);
      },
      hasViewManagerConfig(viewManagerName) {
        return getViewManagerConfig(viewManagerName) != null;
      }
    };
    NativeUIManager_default.getViewManagerConfig = UIManagerJS.getViewManagerConfig;
    function lazifyViewManagerConfig(viewName) {
      const viewConfig = getConstants()[viewName];
      viewManagerConfigs[viewName] = viewConfig;
      if (viewConfig.Manager) {
        defineLazyObjectProperty(viewConfig, "Constants", {
          get: () => {
            const viewManager = NativeModules2[viewConfig.Manager];
            const constants = {};
            viewManager && Object.keys(viewManager).forEach((key) => {
              const value = viewManager[key];
              if (typeof value !== "function") {
                constants[key] = value;
              }
            });
            return constants;
          }
        });
        defineLazyObjectProperty(viewConfig, "Commands", {
          get: () => {
            const viewManager = NativeModules2[viewConfig.Manager];
            const commands = {};
            let index = 0;
            viewManager && Object.keys(viewManager).forEach((key) => {
              const value = viewManager[key];
              if (typeof value === "function") {
                commands[key] = index++;
              }
            });
            return commands;
          }
        });
      }
    }
    if (Platform.OS === "ios") {
      Object.keys(getConstants()).forEach((viewName) => {
        lazifyViewManagerConfig(viewName);
      });
    } else if (getConstants().ViewManagerNames) {
      NativeUIManager_default.getConstants().ViewManagerNames.forEach((viewManagerName) => {
        defineLazyObjectProperty(NativeUIManager_default, viewManagerName, {
          get: () => NativeUIManager_default.getConstantsForViewManager(viewManagerName)
        });
      });
    }
    if (!globalThis.nativeCallSyncHook) {
      Object.keys(getConstants()).forEach((viewManagerName) => {
        if (!UIManagerProperties.includes(viewManagerName)) {
          if (!viewManagerConfigs[viewManagerName]) {
            viewManagerConfigs[viewManagerName] = getConstants()[viewManagerName];
          }
          defineLazyObjectProperty(NativeUIManager_default, viewManagerName, {
            get: () => {
              console.warn(
                `Accessing view manager configs directly off UIManager via UIManager['${viewManagerName}'] is no longer supported. Use UIManager.getViewManagerConfig('${viewManagerName}') instead.`
              );
              return UIManagerJS.getViewManagerConfig(viewManagerName);
            }
          });
        }
      });
    }
    module.exports = UIManagerJS;
  }
});

// react-devtools-shared/src/ReactNativeFiberInspector.js
var nullthrows = (value, message) => {
  if (value === null || value === void 0) {
    throw new Error(message || "Got unexpected null/undefined");
  }
  return value;
};
var ReactCurrentOwner = {
  current: null
};
var currentOwner = ReactCurrentOwner.current;
var isRendering = false;
function getNearestMountedFiber(fiber) {
  let node = fiber;
  let nearestMounted = fiber;
  if (!fiber.alternate) {
    let nextNode = node;
    do {
      node = nextNode;
      if ((node.flags & (Placement | Hydrating)) !== NoFlags) {
        nearestMounted = node.return;
      }
      nextNode = node.return;
    } while (nextNode);
  } else {
    while (node.return) {
      node = node.return;
    }
  }
  if (node.tag === HostRoot) {
    return nearestMounted;
  }
  return null;
}
function assertIsMounted(fiber) {
  if (getNearestMountedFiber(fiber) !== fiber) {
    throw new Error("Unable to find node on an unmounted component.");
  }
}
function findCurrentHostFiberImpl(node) {
  if (node.tag === HostComponent || node.tag === HostText) {
    return node;
  }
  let child = node.child;
  while (child !== null) {
    const match = findCurrentHostFiberImpl(child);
    if (match !== null) {
      return match;
    }
    child = child.sibling;
  }
  return null;
}
function describeFiber(fiber, owner) {
  const displayName = getComponentNameFromType(fiber.type) || "Unknown";
  return "\n    in " + displayName;
}
function describeDebugInfoFrame(name, env, debugLocation) {
  return "\n    in " + name;
}
function findHostInstanceWithWarning(component, methodName) {
  return findHostInstance(component);
}
function findHostInstance(component) {
  const fiber = component._reactInternalFiber || component._reactInternalInstance;
  if (!fiber) {
    return null;
  }
  return findCurrentHostFiber(fiber);
}
function getNativeTagFromPublicInstance(publicInstance) {
  if (publicInstance._nativeTag != null) {
    return publicInstance._nativeTag;
  }
  return null;
}
function getContextName(context) {
  return context.displayName || "Context";
}
function getWrappedName(outerType, innerType, wrapperName) {
  const displayName = innerType.displayName || innerType.name || "";
  return outerType.displayName || (displayName !== "" ? wrapperName + "(" + displayName + ")" : wrapperName);
}
var Placement = 2;
var Hydrating = 64;
var NoFlags = 0;
var HostRoot = 3;
var HostText = 6;
var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
var REACT_TRACING_MARKER_TYPE = Symbol.for("react.tracing_marker");
var REACT_PORTAL_TYPE = Symbol.for("react.portal");
var REACT_CONTEXT_TYPE = Symbol.for("react.context");
var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
var REACT_MEMO_TYPE = Symbol.for("react.memo");
var REACT_LAZY_TYPE = Symbol.for("react.lazy");
var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
var enableViewTransition = false;
var enableTransitionTracing = false;
function getFabricUIManager() {
  return globalThis.nativeFabricUIManager;
}
function isFabricReactTag(reactTag) {
  return reactTag % 2 === 0;
}
var UIManagerImpl = globalThis.RN$Bridgeless === true ? require_BridgelessUIManager() : require_PaperUIManager();
var UIManager = {
  ...UIManagerImpl,
  measure(reactTag, callback) {
    if (isFabricReactTag(reactTag)) {
      const FabricUIManager = nullthrows(getFabricUIManager());
      const shadowNode = FabricUIManager.findShadowNodeByTag_DEPRECATED(reactTag);
      if (shadowNode) {
        FabricUIManager.measure(shadowNode, callback);
      } else {
        console.warn(`measure cannot find view with tag #${reactTag}`);
        callback();
      }
    } else {
      UIManagerImpl.measure(reactTag, callback);
    }
  },
  measureInWindow(reactTag, callback) {
    if (isFabricReactTag(reactTag)) {
      const FabricUIManager = nullthrows(getFabricUIManager());
      const shadowNode = FabricUIManager.findShadowNodeByTag_DEPRECATED(reactTag);
      if (shadowNode) {
        FabricUIManager.measureInWindow(shadowNode, callback);
      } else {
        console.warn(`measure cannot find view with tag #${reactTag}`);
        callback();
      }
    } else {
      UIManagerImpl.measureInWindow(reactTag, callback);
    }
  },
  measureLayout(reactTag, ancestorReactTag, errorCallback, callback) {
    if (isFabricReactTag(reactTag)) {
      const FabricUIManager = nullthrows(getFabricUIManager());
      const shadowNode = FabricUIManager.findShadowNodeByTag_DEPRECATED(reactTag);
      const ancestorShadowNode = FabricUIManager.findShadowNodeByTag_DEPRECATED(ancestorReactTag);
      if (!shadowNode || !ancestorShadowNode) {   
        return;
      }
      FabricUIManager.measureLayout(
        shadowNode,
        ancestorShadowNode,
        errorCallback,
        callback
      );
    } else {
      UIManagerImpl.measureLayout(
        reactTag,
        ancestorReactTag,
        errorCallback,
        callback
      );
    }
  },
  measureLayoutRelativeToParent(reactTag, errorCallback, callback) {
    if (isFabricReactTag(reactTag)) {
      console.warn(
        "RCTUIManager.measureLayoutRelativeToParent method is deprecated and it will not be implemented in newer versions of RN (Fabric) - T47686450"
      );
      const FabricUIManager = nullthrows(getFabricUIManager());
      const shadowNode = FabricUIManager.findShadowNodeByTag_DEPRECATED(reactTag);
      if (shadowNode) {
        FabricUIManager.measure(
          shadowNode,
          (left, top, width, height, pageX, pageY) => {
            callback(left, top, width, height);
          }
        );
      }
    } else {
      UIManagerImpl.measureLayoutRelativeToParent(
        reactTag,
        errorCallback,
        callback
      );
    }
  },
  dispatchViewManagerCommand(reactTag, commandName, commandArgs) {
    if (isFabricReactTag(reactTag)) {
      const FabricUIManager = nullthrows(getFabricUIManager());
      const shadowNode = FabricUIManager.findShadowNodeByTag_DEPRECATED(reactTag);
      if (shadowNode) {
        commandName = `${commandName}`;
        FabricUIManager.dispatchCommand(shadowNode, commandName, commandArgs);
      }
    } else {
      UIManagerImpl.dispatchViewManagerCommand(
        reactTag,
        // We have some legacy components that are actually already using strings. ¯\_(ツ)_/¯
        // $FlowFixMe[incompatible-call]
        commandName,
        commandArgs
      );
    }
  }
};
function getNodeFromPublicInstance(publicInstance) {
  if (!publicInstance || !publicInstance.__internalInstanceHandle) {
    return null;
  }
  return getNodeFromInternalInstanceHandle(
    publicInstance.__internalInstanceHandle
  );
}
function findCurrentFiberUsingSlowPath(fiber) {
  const alternate = fiber.alternate;
  if (!alternate) {
    const nearestMounted = getNearestMountedFiber(fiber);
    if (nearestMounted === null) {
      throw new Error("Unable to find node on an unmounted component.");
    }
    if (nearestMounted !== fiber) {
      return null;
    }
    return fiber;
  }
  let a = fiber;
  let b = alternate;
  while (true) {
    const parentA = a.return;
    if (parentA === null) {
      break;
    }
    const parentB = parentA.alternate;
    if (parentB === null) {
      const nextParent = parentA.return;
      if (nextParent !== null) {
        a = b = nextParent;
        continue;
      }
      break;
    }
    if (parentA.child === parentB.child) {
      let child = parentA.child;
      while (child) {
        if (child === a) {
          assertIsMounted(parentA);
          return fiber;
        }
        if (child === b) {
          assertIsMounted(parentA);
          return alternate;
        }
        child = child.sibling;
      }
      throw new Error("Unable to find node on an unmounted component.");
    }
    if (a.return !== b.return) {
      a = parentA;
      b = parentB;
    } else {
      let didFindChild = false;
      let child = parentA.child;
      while (child) {
        if (child === a) {
          didFindChild = true;
          a = parentA;
          b = parentB;
          break;
        }
        if (child === b) {
          didFindChild = true;
          b = parentA;
          a = parentB;
          break;
        }
        child = child.sibling;
      }
      if (!didFindChild) {
        child = parentB.child;
        while (child) {
          if (child === a) {
            didFindChild = true;
            a = parentB;
            b = parentA;
            break;
          }
          if (child === b) {
            didFindChild = true;
            b = parentB;
            a = parentA;
            break;
          }
          child = child.sibling;
        }
        if (!didFindChild) {
          throw new Error(
            "Child was not found in either parent set. This indicates a bug in React related to the return pointer. Please file an issue."
          );
        }
      }
    }
    if (a.alternate !== b) {
      throw new Error(
        "Return fibers should always be each others' alternates. This error is likely caused by a bug in React. Please file an issue."
      );
    }
  }
  if (a.tag !== HostRoot) {
    throw new Error("Unable to find node on an unmounted component.");
  }
  if (a.stateNode.current === a) {
    return fiber;
  }
  return alternate;
}
function findCurrentHostFiber(parent) {
  const currentParent = findCurrentFiberUsingSlowPath(parent);
  return currentParent !== null ? findCurrentHostFiberImpl(currentParent) : null;
}
function getStackByFiberInDevAndProd(workInProgress) {
  try {
    let info = "";
    let node = workInProgress;
    let previous = null;
    do {
      info += describeFiber(node, previous);
      if (true) {
        const debugInfo = node._debugInfo;
        if (debugInfo) {
          for (let i = debugInfo.length - 1; i >= 0; i--) {
            const entry = debugInfo[i];
            if (typeof entry.name === "string") {
              info += describeDebugInfoFrame(
                entry.name,
                entry.env,
                entry.debugLocation
              );
            }
          }
        }
      }
      previous = node;
      node = node.return;
    } while (node);
    return info;
  } catch (x) {
    return "\nError generating stack: " + x.message + "\n" + x.stack;
  }
}
function getClosestInstanceFromNode(tag) {
  var instanceCache = globalThis.__REACT_NATIVE_INSTANCE_CACHE__;
  return instanceCache.get(tag) || null;
}
function findNodeHandle(componentOrHandle) {
  if (true) {
    const owner = currentOwner;
    if (owner !== null && isRendering && owner.stateNode !== null) {
      if (!owner.stateNode._warnedAboutRefsInRender) {
        console.error(
          "%s is accessing findNodeHandle inside its render(). render() should be a pure function of props and state. It should never access something that requires stale data from the previous render, such as refs. Move this logic to componentDidMount and componentDidUpdate instead.",
          getComponentNameFromType(owner.type) || "A component"
        );
      }
      owner.stateNode._warnedAboutRefsInRender = true;
    }
  }
  if (componentOrHandle == null) {
    return null;
  }
  if (typeof componentOrHandle === "number") {
    return componentOrHandle;
  }
  if (componentOrHandle._nativeTag) {
    return componentOrHandle._nativeTag;
  }
  if (componentOrHandle.canonical != null && componentOrHandle.canonical.nativeTag != null) {
    return componentOrHandle.canonical.nativeTag;
  }
  const nativeTag = getNativeTagFromPublicInstance(componentOrHandle);
  if (nativeTag) {
    return nativeTag;
  }
  let hostInstance;
  if (true) {
    hostInstance = findHostInstanceWithWarning(
      componentOrHandle,
      "findNodeHandle"
    );
  } else {
    hostInstance = findHostInstance(componentOrHandle);
  }
  if (hostInstance == null) {
    return hostInstance;
  }
  if (hostInstance._nativeTag != null) {
    return hostInstance._nativeTag;
  }
  return getNativeTagFromPublicInstance(hostInstance);
}
function getNodeFromInternalInstanceHandle(internalInstanceHandle) {
  return (
    // $FlowExpectedError[incompatible-return] internalInstanceHandle is opaque but we need to make an exception here.
    internalInstanceHandle && // $FlowExpectedError[incompatible-return]
    internalInstanceHandle.stateNode && // $FlowExpectedError[incompatible-use]
    internalInstanceHandle.stateNode.node
  );
}
var HostComponent = 5;
function getComponentNameFromType(type) {
  if (type == null) {
    return null;
  }
  if (typeof type === "function") {
    if (type.$$typeof === REACT_CLIENT_REFERENCE) {
      return null;
    }
    return type.displayName || type.name || null;
  }
  if (typeof type === "string") {
    return type;
  }
  switch (type) {
    case REACT_FRAGMENT_TYPE:
      return "Fragment";
    case REACT_PROFILER_TYPE:
      return "Profiler";
    case REACT_STRICT_MODE_TYPE:
      return "StrictMode";
    case REACT_SUSPENSE_TYPE:
      return "Suspense";
    case REACT_SUSPENSE_LIST_TYPE:
      return "SuspenseList";
    case REACT_ACTIVITY_TYPE:
      return "Activity";
    case REACT_VIEW_TRANSITION_TYPE:
      if (enableViewTransition) {
        return "ViewTransition";
      }
    case REACT_TRACING_MARKER_TYPE:
      if (enableTransitionTracing) {
        return "TracingMarker";
      }
  }
  if (typeof type === "object") {
    if (true) {
      if (typeof type.tag === "number") {
        console.error(
          "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
        );
      }
    }
    switch (type.$$typeof) {
      case REACT_PORTAL_TYPE:
        return "Portal";
      case REACT_CONTEXT_TYPE:
        const context = type;
        return getContextName(context);
      case REACT_CONSUMER_TYPE:
        const consumer = type;
        return getContextName(consumer._context) + ".Consumer";
      case REACT_FORWARD_REF_TYPE:
        return getWrappedName(type, type.render, "ForwardRef");
      case REACT_MEMO_TYPE:
        const outerName = type.displayName || null;
        if (outerName !== null) {
          return outerName;
        }
        return getComponentNameFromType(type.type) || "Memo";
      case REACT_LAZY_TYPE: {
        const lazyComponent = type;
        const payload = lazyComponent._payload;
        const init = lazyComponent._init;
        try {
          return getComponentNameFromType(init(payload));
        } catch (x) {
          return null;
        }
      }
    }
  }
  return null;
}
var getInspectorDataForInstance;
if (true) {
  const emptyObject = Object.freeze({});
  const createHierarchy = function(fiberHierarchy) {
    return fiberHierarchy.map((fiber) => ({
      name: getComponentNameFromType(fiber.type),
      getInspectorData: () => {
        return {
          props: getHostProps(fiber),
          measure: (callback) => {
            const hostFiber = findCurrentHostFiber(fiber);
            const node = hostFiber != null && hostFiber.stateNode !== null && hostFiber.stateNode.node;
            if (node) {
              nativeFabricUIManager.measure(node, callback);
            } else {
              return UIManager.measure(getHostNode(fiber), callback);
            }
          }
        };
      }
    }));
  };
  const getHostNode = function(fiber) {
    let hostNode;
    while (fiber) {
      if (fiber.stateNode !== null && fiber.tag === HostComponent) {
        hostNode = findNodeHandle(fiber.stateNode);
      }
      if (hostNode) {
        return hostNode;
      }
      fiber = fiber.child;
    }
    return null;
  };
  const getHostProps = function(fiber) {
    const host = findCurrentHostFiber(fiber);
    if (host) {
      return host.memoizedProps || emptyObject;
    }
    return emptyObject;
  };
  getInspectorDataForInstance = function(closestInstance) {
    if (!closestInstance) {
      return {
        hierarchy: [],
        props: emptyObject,
        selectedIndex: null,
        componentStack: ""
      };
    }
    const fiber = findCurrentFiberUsingSlowPath(closestInstance);
    if (fiber === null) {
      return {
        hierarchy: [],
        props: emptyObject,
        selectedIndex: null,
        componentStack: ""
      };
    }
    const fiberHierarchy = getOwnerHierarchy(fiber);
    const instance = lastNonHostInstance(fiberHierarchy);
    const hierarchy = createHierarchy(fiberHierarchy);
    const props = getHostProps(instance);
    const selectedIndex = fiberHierarchy.indexOf(instance);
    const componentStack = getStackByFiberInDevAndProd(fiber);
    return {
      closestInstance: instance,
      hierarchy,
      props,
      selectedIndex,
      componentStack
    };
  };
  const getOwnerHierarchy = function(instance) {
    const hierarchy = [];
    traverseOwnerTreeUp(hierarchy, instance);
    return hierarchy;
  };
  const lastNonHostInstance = function(hierarchy) {
    for (let i = hierarchy.length - 1; i > 1; i--) {
      const instance = hierarchy[i];
      if (instance.tag !== HostComponent) {
        return instance;
      }
    }
    return hierarchy[0];
  };
  const traverseOwnerTreeUp = function(hierarchy, instance) {
    hierarchy.unshift(instance);
    const owner = instance._debugOwner;
    if (owner != null && typeof owner.tag === "number") {
      traverseOwnerTreeUp(hierarchy, owner);
    } else {
    }
  };
}
function getInspectorDataForViewTag(viewTag) {
  if (true) {
    const closestInstance = getClosestInstanceFromNode(viewTag);
    return getInspectorDataForInstance(closestInstance);
  } else {
    throw new Error(
      "getInspectorDataForViewTag() is not available in production"
    );
  }
}
function getInspectorDataForViewAtPoint(inspectedView, locationX, locationY, callback) {
  if (true) {
    let closestInstance = null;
    const fabricNode = getNodeFromPublicInstance(inspectedView);
    if (fabricNode) {
      nativeFabricUIManager.findNodeAtPoint(
        fabricNode,
        locationX,
        locationY,
        (internalInstanceHandle) => {
          const node = internalInstanceHandle != null ? getNodeFromInternalInstanceHandle(internalInstanceHandle) : null;
          if (internalInstanceHandle == null || node == null) {
            callback({
              pointerY: locationY,
              frame: { left: 0, top: 0, width: 0, height: 0 },
              ...getInspectorDataForInstance(closestInstance)
            });
            return;
          }
          closestInstance = internalInstanceHandle.stateNode.canonical.internalInstanceHandle;
          const closestPublicInstance = internalInstanceHandle.stateNode.canonical.publicInstance;
          const nativeViewTag = internalInstanceHandle.stateNode.canonical.nativeTag;
          nativeFabricUIManager.measure(
            node,
            (x, y, width, height, pageX, pageY) => {
              const inspectorData = getInspectorDataForInstance(closestInstance);
              callback({
                ...inspectorData,
                pointerY: locationY,
                frame: { left: pageX, top: pageY, width, height },
                touchedViewTag: nativeViewTag,
                closestPublicInstance
              });
            }
          );
        }
      );
    } else if (inspectedView._internalFiberInstanceHandleDEV != null) {
      UIManager.findSubviewIn(
        findNodeHandle(inspectedView),
        [locationX, locationY],
        (nativeViewTag, left, top, width, height) => {
          const inspectorData = getInspectorDataForInstance(
            getClosestInstanceFromNode(nativeViewTag)
          );
          callback({
            ...inspectorData,
            pointerY: locationY,
            frame: { left, top, width, height },
            touchedViewTag: nativeViewTag,
            // $FlowExpectedError[incompatible-call]
            closestPublicInstance: nativeViewTag
          });
        }
      );
    } else {
      console.error(
        "getInspectorDataForViewAtPoint expects to receive a host component"
      );
      return;
    }
  } else {
    throw new Error(
      "getInspectorDataForViewAtPoint() is not available in production."
    );
  }
}

var renderer = {
  getInspectorDataForInstance,
  getInspectorDataForViewAtPoint,
  getInspectorDataForViewTag
};
var ReactNativeFiberInspector_default = renderer;
export {
  ReactNativeFiberInspector_default as default,
  getFabricUIManager
};

//# sourceMappingURL=ReactNativeFiberInspector.bundle.js.map
