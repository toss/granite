#include "BundleEvaluator.h"
#include "FileReader.h"
#include <granite/ExecutionContext.h>

#include <jsi/jsi.h>

namespace granite::microfrontend {

using facebook::jni::JArrayByte;
using facebook::jni::JString;
using facebook::jni::alias_ref;
using facebook::jsi::Runtime;
using facebook::jsi::StringBuffer;

namespace {
void evaluateWithExecution(
    Runtime& runtime,
    std::string source,
    std::string sourceUrl,
    alias_ref<JString> executionId) {
  namespace jsi = facebook::jsi;
  auto root = runtime.global().getProperty(runtime, "__MICRO_FRONTEND__");
  const bool installed = root.isObject() &&
      root.asObject(runtime).getProperty(runtime, "microFrontendExecutionContext").isObject();
  if (!installed && !executionId) {
    runtime.evaluateJavaScript(std::make_shared<StringBuffer>(std::move(source)), sourceUrl);
    return;
  }
  // Validate the shared execution contract before restoring a captured lifetime.
  granite::execution::capture(runtime);
  auto context = root.asObject(runtime).getPropertyAsObject(runtime, "microFrontendExecutionContext");
  jsi::Value token = jsi::Value::null();
  if (executionId) {
    jsi::Object value(runtime);
    value.setProperty(runtime, "id", jsi::String::createFromUtf8(runtime, executionId->toStdString()));
    token = std::move(value);
  }
  auto evaluate = jsi::Function::createFromHostFunction(
      runtime, jsi::PropNameID::forAscii(runtime, "evaluateOwnedBundle"), 0,
      [buffer = std::make_shared<StringBuffer>(std::move(source)), sourceUrl = std::move(sourceUrl)](
          Runtime& runtime, const jsi::Value&, const jsi::Value*, size_t) {
        runtime.evaluateJavaScript(buffer, sourceUrl);
        return jsi::Value::undefined();
      });
  context.getPropertyAsFunction(runtime, "run").callWithThis(runtime, context, token, evaluate);
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
    alias_ref<JString> sourceUrl,
    alias_ref<JString> executionId) {
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
  evaluateWithExecution(*runtime, std::move(source), sourceUrl->toStdString(), executionId);
}

void BundleEvaluator::evaluateFileSync(
    alias_ref<jhybridobject>,
    jlong runtimePointer,
    alias_ref<JString> filePath,
    alias_ref<JString> sourceUrl,
    alias_ref<JString> executionId) {
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
  evaluateWithExecution(*runtime, std::move(source), sourceUrl->toStdString(), executionId);
}

} // namespace granite::microfrontend
