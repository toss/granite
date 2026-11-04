#pragma once

#ifdef __cplusplus

#include <jsi/jsi.h>
#include <memory>
#include <optional>
#include <string>

// Independent execution-context core: no sessions, modules, or registry dependencies.
namespace rnexecution {
namespace jsi = facebook::jsi;
constexpr const char* kContext = "__RN_EXECUTION_CONTEXT_V1__";

struct Scope {
  bool root = true;
  std::optional<std::string> id;
};
struct State {
  Scope current;
  std::optional<std::string> root;
};
class Handle final : public jsi::HostObject {
 public:
  Handle(std::shared_ptr<State> owner, Scope scope) : owner(std::move(owner)), scope(std::move(scope)) {}
  std::shared_ptr<State> owner;
  Scope scope;
};
class Restore final {
 public:
  Restore(State& state, Scope scope) : state_(state), previous_(state.current) { state.current = std::move(scope); }
  ~Restore() { state_.current = std::move(previous_); }
  Restore(const Restore&) = delete;
  Restore& operator=(const Restore&) = delete;
 private:
  State& state_;
  Scope previous_;
};
inline Scope readScope(jsi::Runtime& runtime, const jsi::Value& token) {
  if (token.isUndefined()) return {};
  if (token.isNull()) return {false, std::nullopt};
  if (!token.isString() || token.asString(runtime).utf8(runtime).empty()) {
    throw jsi::JSError(runtime, "Execution context requires a nonempty identity, null, or undefined");
  }
  return {false, token.asString(runtime).utf8(runtime)};
}
inline jsi::Value identity(jsi::Runtime& runtime, const std::optional<std::string>& id) {
  return id ? jsi::Value(jsi::String::createFromUtf8(runtime, *id)) : jsi::Value::null();
}

/** Install once per runtime, on its JS thread. Handles never cross native queues or runtimes. */
inline void install(jsi::Runtime& runtime) {
  if (!runtime.global().getProperty(runtime, kContext).isUndefined()) {
    auto api = runtime.global().getPropertyAsObject(runtime, kContext);
    auto version = api.getProperty(runtime, "version");
    if (!version.isNumber() || version.asNumber() != 1) throw jsi::JSError(runtime, "Incompatible execution context");
    return;
  }
  auto state = std::make_shared<State>();
  jsi::Object api(runtime);
  api.setProperty(runtime, "version", 1);
  api.setProperty(runtime, "capture", jsi::Function::createFromHostFunction(runtime,
      jsi::PropNameID::forAscii(runtime, "capture"), 0,
      [state](jsi::Runtime& runtime, const jsi::Value&, const jsi::Value*, size_t) {
        return jsi::Object::createFromHostObject(runtime, std::make_shared<Handle>(state, state->current));
      }));
  api.setProperty(runtime, "current", jsi::Function::createFromHostFunction(runtime,
      jsi::PropNameID::forAscii(runtime, "current"), 0,
      [state](jsi::Runtime& runtime, const jsi::Value&, const jsi::Value*, size_t) {
        return identity(runtime, state->current.root ? state->root : state->current.id);
      }));
  api.setProperty(runtime, "bindRoot", jsi::Function::createFromHostFunction(runtime,
      jsi::PropNameID::forAscii(runtime, "bindRoot"), 1,
      [state](jsi::Runtime& runtime, const jsi::Value&, const jsi::Value* args, size_t count) {
        if (count != 1) throw jsi::JSError(runtime, "bindRoot requires an identity");
        auto scope = readScope(runtime, args[0]);
        if (!scope.id || (state->root && state->root != scope.id)) {
          throw jsi::JSError(runtime, "Runtime execution lifetime cannot be replaced");
        }
        state->root = scope.id;
        return jsi::Value::undefined();
      }));
  for (bool captured : {false, true}) {
    const char* name = captured ? "runSnapshot" : "runToken";
    api.setProperty(runtime, name, jsi::Function::createFromHostFunction(runtime,
        jsi::PropNameID::forAscii(runtime, name), 2,
        [state, captured](jsi::Runtime& runtime, const jsi::Value&, const jsi::Value* args, size_t count) {
          if (count != 2 || !args[1].isObject() || !args[1].asObject(runtime).isFunction(runtime)) {
            throw jsi::JSError(runtime, "Execution scope requires a token and synchronous callback");
          }
          Scope scope;
          if (captured) {
            if (!args[0].isObject() || !args[0].asObject(runtime).isHostObject<Handle>(runtime)) {
              throw jsi::JSError(runtime, "Invalid execution snapshot");
            }
            auto handle = args[0].asObject(runtime).getHostObject<Handle>(runtime);
            if (handle->owner != state) throw jsi::JSError(runtime, "Snapshot belongs to another runtime");
            scope = handle->scope;
          } else {
            scope = readScope(runtime, args[0]);
          }
          Restore restore(*state, std::move(scope));
          return args[1].asObject(runtime).asFunction(runtime).call(runtime);
        }));
  }
  runtime.global().getPropertyAsObject(runtime, "Object").getPropertyAsFunction(runtime, "freeze").call(runtime, api);
  jsi::Object descriptor(runtime);
  descriptor.setProperty(runtime, "value", std::move(api));
  runtime.global().getPropertyAsObject(runtime, "Object").getPropertyAsFunction(runtime, "defineProperty")
      .call(runtime, runtime.global(), jsi::String::createFromAscii(runtime, kContext), descriptor);
}
} // namespace rnexecution

#endif // __cplusplus
