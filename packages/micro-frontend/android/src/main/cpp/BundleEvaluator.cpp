#include "BundleEvaluator.h"
#include "FileReader.h"

#include <jsi/jsi.h>

#include <string>

namespace granite::microfrontend {

using facebook::jni::JArrayByte;
using facebook::jni::JString;
using facebook::jni::alias_ref;
using facebook::jsi::Runtime;
using facebook::jsi::StringBuffer;

namespace {
namespace jsi = facebook::jsi;

// Deferred evaluation with an evaluation argument.
// A bundle built with the deferred wrapper hands its body back as a function through
// `__GRANITE_DEFERRED_EVAL__` instead of running it. Native then calls the body with
// `{ sourceUrl }`: the argument tells the bundle that native deferred it, and the host runtime
// gives the evaluation its id (`<appName>@<n>`), because only JavaScript knows the app name.
// Bundles without the wrapper run during evaluateJavaScript exactly as before.
void evaluateWithScope(Runtime &runtime, const std::shared_ptr<const jsi::Buffer> &buffer, const std::string &sourceUrl) {
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
} // namespace

void BundleEvaluator::registerNatives() {
  registerHybrid(
      {makeNativeMethod("evaluateFileSync", BundleEvaluator::evaluateFileSync),
       makeNativeMethod("evaluateScriptSync", BundleEvaluator::evaluateScriptSync)});
}

void BundleEvaluator::evaluateScriptSync(
    alias_ref<jhybridobject>,
    jlong runtimePointer,
    alias_ref<JArrayByte> scriptData,
    alias_ref<JString> sourceUrl) {
  if (runtimePointer == 0) {
    facebook::jni::throwNewJavaException(
        "java/lang/IllegalStateException", "JavaScript runtime is unavailable");
    return;
  }

  auto pinnedScriptData = scriptData->pin();
  std::string source{
      reinterpret_cast<const char *>(pinnedScriptData.get()),
      pinnedScriptData.size()};
  auto *runtime = reinterpret_cast<Runtime *>(runtimePointer);
  evaluateWithScope(*runtime, std::make_shared<StringBuffer>(std::move(source)), sourceUrl->toStdString());
}

void BundleEvaluator::evaluateFileSync(
    alias_ref<jhybridobject>,
    jlong runtimePointer,
    alias_ref<JString> filePath,
    alias_ref<JString> sourceUrl) {
  if (runtimePointer == 0) {
    facebook::jni::throwNewJavaException(
        "java/lang/IllegalStateException", "JavaScript runtime is unavailable");
    return;
  }

  const std::string path = filePath->toStdString();
  std::string source;
  try {
    source = io::readFileToMemory(path);
  } catch (const io::FileReaderError &error) {
    switch (error.kind()) {
      case io::FileReaderErrorKind::NotFound:
        facebook::jni::throwNewJavaException(
            "java/io/FileNotFoundException", "%s", error.what());
        break;
      case io::FileReaderErrorKind::StatFailed:
      case io::FileReaderErrorKind::ReadFailed:
        facebook::jni::throwNewJavaException(
            "java/io/IOException", "%s", error.what());
        break;
      case io::FileReaderErrorKind::AllocationFailed:
        facebook::jni::throwNewJavaException(
            "java/lang/OutOfMemoryError", "%s", error.what());
        break;
    }
    return;
  }

  if (source.empty()) {
    facebook::jni::throwNewJavaException(
        "java/io/IOException", "Bundle file is empty: %s", path.c_str());
    return;
  }

  auto *runtime = reinterpret_cast<Runtime *>(runtimePointer);
  evaluateWithScope(*runtime, std::make_shared<StringBuffer>(std::move(source)), sourceUrl->toStdString());
}

} // namespace granite::microfrontend
