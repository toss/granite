---
"@granite-js/screen": patch
"@granite-js/cookies": patch
---

Fix Android builds on AGP 9.
- Use the host app's `compileSdkVersion` when defined, so the libraries pass AGP 9's AAR metadata check against dependencies that require a newer compile SDK.
- Remove the dynamic `com.facebook.fbjni:fbjni:+` dependency from `@granite-js/screen`. `react-android` already exposes fbjni as an API dependency, so the version now follows React Native instead of resolving to the latest release.
