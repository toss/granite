#pragma once

#ifdef __cplusplus

#include <jsi/jsi.h>
#include <memory>
#include <functional>
#include <optional>
#include <string>
#include <utility>

namespace granite::execution {

/** A runtime-owned snapshot. Access and destroy it on that runtime's JS thread. */
class Snapshot final {
 public:
  Snapshot(facebook::jsi::Runtime& runtime, facebook::jsi::Object value)
      : value_(std::move(value)) {
    auto token = value_.getProperty(runtime, "token");
    if (token.isNull()) {
      return;
    }
    if (!token.isObject()) {
      throw facebook::jsi::JSError(runtime, "Invalid execution ownership token");
    }
    auto id = token.asObject(runtime).getProperty(runtime, "id");
    if (!id.isString()) {
      throw facebook::jsi::JSError(runtime, "Execution ownership token requires an id");
    }
    id_ = id.asString(runtime).utf8(runtime);
    if (id_->empty()) {
      throw facebook::jsi::JSError(runtime, "Execution ownership token id cannot be empty");
    }
  }

  /** The host maps this opaque lifetime identity to its own native resources. */
  const std::optional<std::string>& id() const noexcept {
    return id_;
  }

  /** A host adapter may pass this function to another SDK's callback-binding contract. */
  facebook::jsi::Function callbackBinder(facebook::jsi::Runtime& runtime) const {
    return value_.getPropertyAsFunction(runtime, "bind");
  }

  /** The returned JS closure restores the captured execution before invoking the callback. */
  facebook::jsi::Function bind(
      facebook::jsi::Runtime& runtime,
      const facebook::jsi::Function& callback) const {
    return callbackBinder(runtime)
        .callWithThis(runtime, value_, callback)
        .asObject(runtime)
        .asFunction(runtime);
  }

 private:
  facebook::jsi::Object value_;
  std::optional<std::string> id_;
};

/** Synchronous native entry point; call before handing work to a native queue. */
inline Snapshot capture(facebook::jsi::Runtime& runtime) {
  auto global = runtime.global().getProperty(runtime, "__MICRO_FRONTEND__");
  if (!global.isObject()) {
    throw facebook::jsi::JSError(runtime, "Micro-frontend execution runtime is not installed");
  }
  auto value = global.asObject(runtime).getProperty(runtime, "microFrontendExecutionContext");
  if (!value.isObject()) {
    throw facebook::jsi::JSError(runtime, "Micro-frontend execution context is not installed");
  }
  auto context = value.asObject(runtime);
  auto version = context.getProperty(runtime, "version");
  if (!version.isNumber() || version.asNumber() != 1) {
    throw facebook::jsi::JSError(runtime, "Incompatible micro-frontend execution context");
  }
  return Snapshot(
      runtime,
      context.getPropertyAsFunction(runtime, "snapshot")
          .callWithThis(runtime, context)
          .asObject(runtime));
}

/** Install one immutable runtime identity without changing the current service scope. */
inline void installRuntimeIdentity(facebook::jsi::Runtime& runtime, const std::string& id) {
  namespace jsi = facebook::jsi;
  if (id.empty()) { throw jsi::JSError(runtime, "Runtime execution identity cannot be empty"); }
  constexpr auto key = "__GRANITE_EXECUTION_ROOT_ID__";
  auto existing = runtime.global().getProperty(runtime, key);
  if (!existing.isUndefined() && (!existing.isString() || existing.asString(runtime).utf8(runtime) != id)) {
    throw jsi::JSError(runtime, "Runtime execution lifetime cannot be replaced");
  }
  if (existing.isUndefined()) {
    jsi::Object descriptor(runtime);
    descriptor.setProperty(runtime, "value", jsi::String::createFromUtf8(runtime, id));
    descriptor.setProperty(runtime, "writable", false);
    descriptor.setProperty(runtime, "configurable", false);
    runtime.global().getPropertyAsObject(runtime, "Object").getPropertyAsFunction(runtime, "defineProperty")
        .call(runtime, runtime.global(), jsi::String::createFromAscii(runtime, key), descriptor);
  }
  auto root = runtime.global().getProperty(runtime, "__MICRO_FRONTEND__");
  if (root.isUndefined()) { return; }
  if (!root.isObject()) { throw jsi::JSError(runtime, "Invalid micro-frontend runtime"); }
  auto value = root.asObject(runtime).getProperty(runtime, "microFrontendExecutionContext");
  if (value.isUndefined()) { return; }
  auto context = value.asObject(runtime);
  jsi::Object token(runtime);
  token.setProperty(runtime, "id", jsi::String::createFromUtf8(runtime, id));
  context.getPropertyAsFunction(runtime, "bindRuntime").callWithThis(runtime, context, token);
}

/** Bootstrap callbacks keep their explicit identity after the JS context is installed. */
inline facebook::jsi::Function bootstrapCallbackBinder(
    facebook::jsi::Runtime& runtime, std::optional<std::string> id = std::nullopt) {
  namespace jsi = facebook::jsi;
  return jsi::Function::createFromHostFunction(
      runtime, jsi::PropNameID::forAscii(runtime, "bindUnownedExecution"), 1,
      [id](jsi::Runtime& runtime, const jsi::Value&, const jsi::Value* args, size_t count) -> jsi::Value {
        if (count != 1 || !args[0].isObject() || !args[0].asObject(runtime).isFunction(runtime)) {
          throw jsi::JSError(runtime, "Execution binding requires a callback");
        }
        auto callback = std::make_shared<jsi::Function>(args[0].asObject(runtime).asFunction(runtime));
        return jsi::Function::createFromHostFunction(
            runtime, jsi::PropNameID::forAscii(runtime, "unownedExecutionCallback"), 0,
            [callback, id](jsi::Runtime& runtime, const jsi::Value& receiver, const jsi::Value* args, size_t count) {
              auto values = std::make_shared<jsi::Array>(runtime, count);
              for (size_t index = 0; index < count; ++index) {
                values->setValueAtIndex(runtime, index, jsi::Value(runtime, args[index]));
              }
              auto thisValue = std::make_shared<jsi::Value>(runtime, receiver);
              auto invoke = jsi::Function::createFromHostFunction(
                  runtime, jsi::PropNameID::forAscii(runtime, "invokeUnownedCallback"), 0,
                  [callback, values, thisValue](jsi::Runtime& runtime, const jsi::Value&, const jsi::Value*, size_t) {
                    return runtime.global().getPropertyAsObject(runtime, "Reflect")
                        .getPropertyAsFunction(runtime, "apply").call(runtime, *callback, *thisValue, *values);
                  });
              auto root = runtime.global().getProperty(runtime, "__MICRO_FRONTEND__");
              if (root.isUndefined() || (root.isObject() &&
                  root.asObject(runtime).getProperty(runtime, "microFrontendExecutionContext").isUndefined())) {
                return invoke.call(runtime);
              }
              capture(runtime);
              auto context = root.asObject(runtime).getPropertyAsObject(runtime, "microFrontendExecutionContext");
              jsi::Value token = jsi::Value::null();
              if (id) {
                jsi::Object owner(runtime);
                owner.setProperty(runtime, "id", jsi::String::createFromUtf8(runtime, *id));
                token = std::move(owner);
              }
              return context.getPropertyAsFunction(runtime, "run")
                  .callWithThis(runtime, context, token, invoke);
            });
      });
}

/** The embedding host resolves producer identity and liveness for multiplexed callbacks. */
struct CallbackOwnership {
  std::string id;
  bool active;
};
using CallbackOwnershipResolver = std::function<std::optional<CallbackOwnership>(
    facebook::jsi::Runtime&, const facebook::jsi::Value*, size_t)>;

/** An unresolved callback keeps its registration scope; a closed producer is not delivered. */
inline facebook::jsi::Function callbackBinderWithOwnership(
    facebook::jsi::Runtime& runtime,
    facebook::jsi::Function capturedBinder,
    CallbackOwnershipResolver resolve) {
  namespace jsi = facebook::jsi;
  auto binder = std::make_shared<jsi::Function>(std::move(capturedBinder));
  return jsi::Function::createFromHostFunction(
      runtime, jsi::PropNameID::forAscii(runtime, "bindCallbackOwnership"), 1,
      [binder, resolve](jsi::Runtime& runtime, const jsi::Value&, const jsi::Value* args, size_t count) -> jsi::Value {
        if (count != 1 || !args[0].isObject() || !args[0].asObject(runtime).isFunction(runtime)) {
          throw jsi::JSError(runtime, "Execution binding requires a callback");
        }
        auto callback = std::make_shared<jsi::Function>(args[0].asObject(runtime).asFunction(runtime));
        auto captured = std::make_shared<jsi::Function>(binder->call(runtime, *callback).asObject(runtime).asFunction(runtime));
        return jsi::Function::createFromHostFunction(
            runtime, jsi::PropNameID::forAscii(runtime, "ownedNativeCallback"), 0,
            [callback, captured, resolve](jsi::Runtime& runtime, const jsi::Value& receiver, const jsi::Value* args, size_t count) {
              const auto ownership = resolve(runtime, args, count);
              if (ownership && !ownership->active) { return jsi::Value::undefined(); }
              auto values = std::make_shared<jsi::Array>(runtime, count);
              for (size_t index = 0; index < count; ++index) {
                values->setValueAtIndex(runtime, index, jsi::Value(runtime, args[index]));
              }
              auto apply = runtime.global().getPropertyAsObject(runtime, "Reflect").getPropertyAsFunction(runtime, "apply");
              if (!ownership) { return apply.call(runtime, *captured, receiver, *values); }
              if (ownership->id.empty()) { throw jsi::JSError(runtime, "Callback ownership requires an id"); }
              auto thisValue = std::make_shared<jsi::Value>(runtime, receiver);
              auto invoke = jsi::Function::createFromHostFunction(
                  runtime, jsi::PropNameID::forAscii(runtime, "invokeOwnedCallback"), 0,
                  [callback, values, thisValue](jsi::Runtime& runtime, const jsi::Value&, const jsi::Value*, size_t) {
                    return runtime.global().getPropertyAsObject(runtime, "Reflect").getPropertyAsFunction(runtime, "apply")
                        .call(runtime, *callback, *thisValue, *values);
                  });
              auto root = runtime.global().getProperty(runtime, "__MICRO_FRONTEND__");
              const bool bootstrap = root.isUndefined() || (root.isObject() &&
                  root.asObject(runtime).getProperty(runtime, "microFrontendExecutionContext").isUndefined());
              if (bootstrap) {
                auto rootIdentity = runtime.global().getProperty(runtime, "__GRANITE_EXECUTION_ROOT_ID__");
                // Only the installed runtime owner can deliver before JS context initialization.
                if (rootIdentity.isString() && rootIdentity.asString(runtime).utf8(runtime) == ownership->id) {
                  return invoke.call(runtime);
                }
              }
              capture(runtime);
              auto context = runtime.global().getPropertyAsObject(runtime, "__MICRO_FRONTEND__")
                  .getPropertyAsObject(runtime, "microFrontendExecutionContext");
              jsi::Object token(runtime);
              token.setProperty(runtime, "id", jsi::String::createFromUtf8(runtime, ownership->id));
              return context.getPropertyAsFunction(runtime, "run").callWithThis(runtime, context, token, invoke);
            });
      });
}

inline facebook::jsi::Function unownedCallbackBinder(facebook::jsi::Runtime& runtime) {
  return bootstrapCallbackBinder(runtime);
}

} // namespace granite::execution

#endif // __cplusplus
