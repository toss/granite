# Android session contracts

Run from the repository root with JDK 17 and Android SDK 36 installed:

```sh
packages/micro-frontend/examples/portal/android/gradlew \
  -p packages/micro-frontend/android/session-contract-tests \
  testDebugUnitTest --console=plain
```

This standalone Gradle project compiles the production session store, event serializer,
event router, Activity binding, native host and runtime module against React Native 0.84.
It does not require a Node installation or generated Portal renderer code.

Only React Native's generated `NativeGraniteMicroFrontendRuntimeSpec` superclass is
substituted. Its event emitter throws if called; host tests use an acknowledged recording
runtime target. Serialization tests execute `toWritableMap` and replace only JNI map
allocation with `JavaOnlyMap`. Activity lifecycle tests run with Robolectric. These are
JVM contracts, not device, JSI, or renderer integration tests.

The `Micro-frontend Android contracts` workflow runs this project for relevant pull requests.
