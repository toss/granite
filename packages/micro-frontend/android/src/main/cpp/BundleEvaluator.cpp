#include "BundleEvaluator.h"
#include "FileReader.h"

#include <jsi/jsi.h>

namespace granite::microfrontend {

using facebook::jni::JArrayByte;
using facebook::jni::JString;
using facebook::jni::alias_ref;
using facebook::jsi::Runtime;
using facebook::jsi::StringBuffer;

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
  runtime->evaluateJavaScript(
      std::make_shared<StringBuffer>(std::move(source)),
      sourceUrl->toStdString());
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
  runtime->evaluateJavaScript(
      std::make_shared<StringBuffer>(std::move(source)),
      sourceUrl->toStdString());
}

} // namespace granite::microfrontend
