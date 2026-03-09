#include "BundleEvaluator.h"
#include "FileReader.h"
#include <fbjni/fbjni.h>

void BundleEvaluator::registerNatives() {
  registerHybrid({
      makeNativeMethod("evaluateJavascriptSync", BundleEvaluator::evaluateJavascriptSync),
      makeNativeMethod("evaluateFileSync", BundleEvaluator::evaluateFileSync)
  });
}

void BundleEvaluator::evaluateJavascriptSync(
    jni::alias_ref<jhybridobject> jThis,
    jlong jsRuntime,
    jni::alias_ref<JArrayByte> code,
    jni::alias_ref<JString> url) {
  auto pinnedCode = code->pin();
  jbyte *sourcePtr = pinnedCode.get();
  size_t sourceSize = pinnedCode.size();

  // Use initializer list for source and sourceUrl
  std::string source{reinterpret_cast<const char *>(sourcePtr), sourceSize};
  std::string sourceUrl = url->toString();

  if (jsRuntime == 0) {
    return;
  }
  auto rt = reinterpret_cast<jsi::Runtime *>(jsRuntime);
  rt->evaluateJavaScript(std::make_unique<jsi::StringBuffer>(std::move(source)), std::move(sourceUrl));
};

void BundleEvaluator::evaluateFileSync(
    jni::alias_ref<jhybridobject> jThis,
    jlong jsRuntime,
    jni::alias_ref<JString> filePath,
    jni::alias_ref<JString> url) {

  if (jsRuntime == 0) {
    jni::throwNewJavaException(
        "java/lang/IllegalStateException",
        "JS runtime is not available");
    return;
  }

  std::string path = filePath->toStdString();
  std::string sourceUrl = url->toStdString();

  std::string source;
  try {
    source = granite::io::ReadFileToString(path);
  } catch (const granite::io::FileReaderError& e) {
    switch (e.kind()) {
      case granite::io::ErrorKind::kNotFound:
        jni::throwNewJavaException(
            "java/io/FileNotFoundException", "%s", e.what());
        break;
      case granite::io::ErrorKind::kStatFailed:
      case granite::io::ErrorKind::kReadFailed:
        jni::throwNewJavaException(
            "java/io/IOException", "%s", e.what());
        break;
      case granite::io::ErrorKind::kAllocationFailed:
        jni::throwNewJavaException(
            "java/lang/OutOfMemoryError", "%s", e.what());
        break;
    }
    return;
  }

  if (source.empty()) {
    jni::throwNewJavaException(
        "java/io/IOException",
        "Bundle file is empty: %s", path.c_str());
    return;
  }

  auto rt = reinterpret_cast<jsi::Runtime *>(jsRuntime);
  rt->evaluateJavaScript(
      std::make_unique<jsi::StringBuffer>(std::move(source)),
      std::move(sourceUrl));
}
