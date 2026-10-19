#pragma once

#include <fbjni/fbjni.h>
#include <memory>
#include <utility>

namespace facebook::jsi {
class Buffer;
}

namespace granite::microfrontend {

struct BundleEvaluator : facebook::jni::HybridClass<BundleEvaluator> {
  static constexpr auto kJavaDescriptor =
      "Lrun/granite/microfrontend/BundleEvaluator;";

  static void registerNatives();

  explicit BundleEvaluator(std::shared_ptr<const facebook::jsi::Buffer> source)
      : source_(std::move(source)) {}

  static facebook::jni::local_ref<jhybriddata>
  prepareFileSync(facebook::jni::alias_ref<jhybridobject>,
                  facebook::jni::alias_ref<facebook::jni::JString> filePath);

  static facebook::jni::local_ref<jhybriddata> prepareScriptSync(
      facebook::jni::alias_ref<jhybridobject>,
      facebook::jni::alias_ref<facebook::jni::JArrayByte> scriptData);

  void evaluatePreparedSync(
      jlong runtimePointer,
      facebook::jni::alias_ref<facebook::jni::JString> sourceUrl);

private:
  const std::shared_ptr<const facebook::jsi::Buffer> source_;
};

} // namespace granite::microfrontend
