#include <fbjni/fbjni.h>
#include "BundleEvaluator.h"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] { BundleEvaluator::registerNatives(); });
}
