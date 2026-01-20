#include "BundleEvaluator.h"
#include <fbjni/fbjni.h>

void BundleEvaluator::registerNatives() {
  registerHybrid(
      {makeNativeMethod("evaluateJavascriptSync", BundleEvaluator::evaluateJavascriptSync)});
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

  auto rt = (jsi::Runtime *)jsRuntime;
  rt->evaluateJavaScript(std::make_unique<jsi::StringBuffer>(std::move(source)), std::move(sourceUrl));
};
