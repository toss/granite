#include <fbjni/fbjni.h>
#include <jsi/jsi.h>

using namespace facebook;
using namespace facebook::jni;

/**
 * BundleEvaluator - JNI bridge for evaluating JavaScript bundles on the JSI runtime.
 *
 * Provides two evaluation methods:
 * - evaluateJavascriptSync: Accepts a Java byte array (from Kotlin ByteArray).
 *   Peak memory: 2N (Java array + native std::string copy).
 * - evaluateFileSync: Accepts a file path string, reads file via POSIX read() (not mmap).
 *   Peak memory: N (native std::string only, no Java heap allocation for bundle data).
 *
 * WARNING: Thread Safety
 * Both methods execute JavaScript synchronously on the calling thread via a raw
 * jsi::Runtime pointer. The caller must ensure they are on the JS thread.
 * Unlike iOS (which uses callInvoker->invokeAsync), Android performs no automatic
 * thread dispatch.
 *
 * Note: This class is for custom bundle evaluation outside the standard
 * BundleLoader -> ReactHostFactory -> JSBundleLoader path.
 */
struct BundleEvaluator : public jni::HybridClass<BundleEvaluator> {
  static constexpr auto kJavaDescriptor = "Lrun/granite/BundleEvaluator;";

  static void registerNatives();

  /** Evaluates JavaScript from a Java byte array. Pins the array, copies to std::string, then evaluates. */
  static void evaluateJavascriptSync(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsRuntime,
      jni::alias_ref<JArrayByte> code,
      jni::alias_ref<JString> url);

  /** Evaluates JavaScript from a file path. Reads file via POSIX open()/read() into native memory. */
  static void evaluateFileSync(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsRuntime,
      jni::alias_ref<JString> filePath,
      jni::alias_ref<JString> url);
};
