#include <fbjni/fbjni.h>
#include <jsi/jsi.h>

using namespace facebook;
using namespace facebook::jni;

struct BundleEvaluator : public jni::HybridClass<BundleEvaluator> {
  static constexpr auto kJavaDescriptor = "Lrun/granite/BundleEvaluator;";

  static void registerNatives();

  static void evaluateJavascriptSync(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsRuntime,
      jni::alias_ref<JArrayByte> code,
      jni::alias_ref<JString> url);
};
