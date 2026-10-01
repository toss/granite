#include "BundleEvaluator.h"

#include <fbjni/fbjni.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    granite::microfrontend::BundleEvaluator::registerNatives();
  });
}
