#pragma once

#include <jsi/jsi.h>

#include <memory>
#include <string>

namespace granite::microfrontend {

// Deferred evaluation with an evaluation argument. iOS (GraniteMicroFrontendRuntimeModule) and
// Android (BundleEvaluator) both evaluate remote bundles through this function.
// A bundle built with the deferred wrapper hands its body back as a function through
// `__GRANITE_DEFERRED_EVAL__` instead of running it. Native then calls the body with
// `{ sourceUrl }`: the argument tells the bundle that native deferred it, and the host runtime
// gives the evaluation its id (`<appName>@<n>`), because only JavaScript knows the app name.
// Bundles without the wrapper run during evaluateJavaScript exactly as before.
inline void evaluateWithScope(
    facebook::jsi::Runtime &runtime,
    const std::shared_ptr<const facebook::jsi::Buffer> &buffer,
    const std::string &sourceUrl) {
  namespace jsi = facebook::jsi;
  auto global = runtime.global();
  // Only a function is handed over through this slot; ownership travels as the call ARGUMENT below.
  global.setProperty(runtime, "__GRANITE_DEFERRED_EVAL__", true);
  try {
    runtime.evaluateJavaScript(buffer, sourceUrl);
  } catch (...) {
    global.setProperty(runtime, "__GRANITE_DEFERRED_EVAL__", jsi::Value::undefined());
    throw;
  }
  auto slot = global.getProperty(runtime, "__GRANITE_DEFERRED_EVAL__");
  global.setProperty(runtime, "__GRANITE_DEFERRED_EVAL__", jsi::Value::undefined());
  if (!slot.isObject() || !slot.getObject(runtime).isFunction(runtime)) {
    return;  // bundle without the deferred wrapper: it already ran during evaluation
  }
  auto scope = jsi::Object(runtime);
  scope.setProperty(runtime, "sourceUrl", jsi::String::createFromUtf8(runtime, sourceUrl));
  slot.getObject(runtime).getFunction(runtime).call(runtime, scope);
}

} // namespace granite::microfrontend
