#include "BundleEvaluator.h"

#include <fstream>
#include <jsi/jsi.h>
#include <sstream>

namespace granite::microfrontend {

using facebook::jni::JString;
using facebook::jni::alias_ref;
using facebook::jsi::Runtime;
using facebook::jsi::StringBuffer;

void BundleEvaluator::registerNatives() {
  registerHybrid(
      {makeNativeMethod("evaluateFileSync", BundleEvaluator::evaluateFileSync)});
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
  std::ifstream stream(path, std::ios::binary);
  if (!stream.is_open()) {
    facebook::jni::throwNewJavaException(
        "java/io/FileNotFoundException", "Bundle file cannot be opened: %s", path.c_str());
    return;
  }

  std::ostringstream contents;
  contents << stream.rdbuf();
  if (stream.bad()) {
    facebook::jni::throwNewJavaException(
        "java/io/IOException", "Bundle file cannot be read: %s", path.c_str());
    return;
  }

  std::string source = contents.str();
  if (source.empty()) {
    facebook::jni::throwNewJavaException(
        "java/io/IOException", "Bundle file is empty: %s", path.c_str());
    return;
  }

  auto *runtime = reinterpret_cast<Runtime *>(runtimePointer);
  runtime->evaluateJavaScript(
      std::make_unique<StringBuffer>(std::move(source)),
      sourceUrl->toStdString());
}

} // namespace granite::microfrontend
