#include "BundleEvaluator.h"
#include "FileReader.h"

#include <jsi/jsi.h>

namespace granite::microfrontend {

using facebook::jni::alias_ref;
using facebook::jni::JArrayByte;
using facebook::jni::JString;
using facebook::jni::local_ref;
using facebook::jsi::Runtime;
using facebook::jsi::StringBuffer;

namespace {

class FileJSIBuffer final : public facebook::jsi::Buffer {
public:
  explicit FileJSIBuffer(io::FileBytes source) : source_(std::move(source)) {}
  const uint8_t *data() const override { return source_.data.get(); }
  size_t size() const override { return source_.size; }

private:
  const io::FileBytes source_;
};

} // namespace

void BundleEvaluator::registerNatives() {
  registerHybrid(
      {makeNativeMethod("prepareFileSync", BundleEvaluator::prepareFileSync),
       makeNativeMethod("prepareScriptSync",
                        BundleEvaluator::prepareScriptSync),
       makeNativeMethod("evaluatePreparedSync",
                        BundleEvaluator::evaluatePreparedSync)});
}

local_ref<BundleEvaluator::jhybriddata>
BundleEvaluator::prepareScriptSync(alias_ref<jhybridobject>,
                                   alias_ref<JArrayByte> scriptData) {
  auto pinnedScriptData = scriptData->pin();
  try {
    std::string source{reinterpret_cast<const char *>(pinnedScriptData.get()),
                       pinnedScriptData.size()};
    return makeCxxInstance(std::make_shared<StringBuffer>(std::move(source)));
  } catch (const std::bad_alloc &) {
    facebook::jni::throwNewJavaException("java/lang/OutOfMemoryError",
                                         "Bundle buffer cannot be allocated");
    return {};
  }
}

local_ref<BundleEvaluator::jhybriddata>
BundleEvaluator::prepareFileSync(alias_ref<jhybridobject>,
                                 alias_ref<JString> filePath) {
  const std::string path = filePath->toStdString();
  try {
    auto source = io::readFileToMemory(path);
    if (source.size == 0) {
      facebook::jni::throwNewJavaException(
          "java/io/IOException", "Bundle file is empty: %s", path.c_str());
      return {};
    }
    return makeCxxInstance(std::make_shared<FileJSIBuffer>(std::move(source)));
  } catch (const io::FileReaderError &error) {
    switch (error.kind()) {
    case io::FileReaderErrorKind::NotFound:
      facebook::jni::throwNewJavaException("java/io/FileNotFoundException",
                                           "%s", error.what());
      break;
    case io::FileReaderErrorKind::StatFailed:
    case io::FileReaderErrorKind::ReadFailed:
      facebook::jni::throwNewJavaException("java/io/IOException", "%s",
                                           error.what());
      break;
    case io::FileReaderErrorKind::AllocationFailed:
      facebook::jni::throwNewJavaException("java/lang/OutOfMemoryError", "%s",
                                           error.what());
      break;
    }
    return {};
  } catch (const std::bad_alloc &) {
    facebook::jni::throwNewJavaException(
        "java/lang/OutOfMemoryError", "Bundle buffer cannot be allocated: %s",
        path.c_str());
    return {};
  }
}

void BundleEvaluator::evaluatePreparedSync(jlong runtimePointer,
                                           alias_ref<JString> sourceUrl) {
  if (runtimePointer == 0) {
    facebook::jni::throwNewJavaException("java/lang/IllegalStateException",
                                         "JavaScript runtime is unavailable");
    return;
  }
  auto *runtime = reinterpret_cast<Runtime *>(runtimePointer);
  // Hermes can retain this buffer after the JNI holder has been released.
  runtime->evaluateJavaScript(source_, sourceUrl->toStdString());
}

} // namespace granite::microfrontend
