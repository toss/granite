#pragma once

#include <fbjni/fbjni.h>

namespace granite::microfrontend {

struct BundleEvaluator : facebook::jni::HybridClass<BundleEvaluator> {
  static constexpr auto kJavaDescriptor =
      "Lrun/granite/microfrontend/BundleEvaluator;";

  static void registerNatives();

  static void evaluateFileSync(
      facebook::jni::alias_ref<jhybridobject>,
      jlong runtimePointer,
      facebook::jni::alias_ref<facebook::jni::JString> filePath,
      facebook::jni::alias_ref<facebook::jni::JString> sourceUrl);

  static void evaluateScriptSync(
      facebook::jni::alias_ref<jhybridobject>,
      jlong runtimePointer,
      facebook::jni::alias_ref<facebook::jni::JArrayByte> scriptData,
      facebook::jni::alias_ref<facebook::jni::JString> sourceUrl);
};

} // namespace granite::microfrontend
