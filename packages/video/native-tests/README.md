# iOS provider tests

Run on macOS with Xcode, CocoaPods, Node and Corepack installed:

```sh
IOS_TEST_DESTINATION='platform=iOS Simulator,name=iPhone 16 Pro' packages/video/native-tests/test-ios.sh
```

Use a simulator available on your machine. The script creates a temporary RN 0.86.3 app,
then runs the `GraniteVideo` provider test spec against the real Fabric view. Set
`NATIVE_TEST_WORK_DIR` to reuse its dependencies and build products on later runs.

The tests cover option forwarding before source loading, unchanged props, restoring
provider settings when a view is recycled, and providers without optional setters.
No network video or audio playback is required.
