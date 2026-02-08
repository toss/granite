# Granite Gradle Plugin

**Granite** is a Gradle plugin that enables full React Native features in Android Library modules (AAR). The official `com.facebook.react` plugin only provides complete functionality for Application modules—Granite solves this limitation.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Gradle Plugin Portal](https://img.shields.io/badge/Gradle-Plugin-brightgreen)](https://plugins.gradle.org/plugin/run.granite.library)

---

## Overview

Granite Gradle Plugin brings React Native to Android Library modules with full support for:
- **TurboModules & Fabric** (New Architecture required)
- **Autolinking** for native module discovery
- **JavaScript bundling** with Hermes bytecode compilation
- **AAR packaging** with bundled assets and native libraries
- **Multiple ReactHost instances** for modular architectures

**Key Use Cases:**
- Package React Native features as reusable AAR libraries
- Multi-module architecture with isolated React Native screens
- Share React Native components across multiple Android apps

---

## Feature Comparison

| Feature | com.facebook.react | run.granite.library |
|---------|-------------------|---------------------|
| Application module support | ✅ Yes | ❌ No (library only) |
| Library module support | ❌ No | ✅ Yes |
| TurboModules codegen | ✅ Yes | ✅ Yes |
| Fabric component codegen | ✅ Yes | ✅ Yes |
| Autolinking | ✅ Yes | ✅ Yes |
| Hermes | ✅ Yes | ✅ Yes (required) |
| JSC (JavaScriptCore) | ✅ Yes | ❌ No |
| JS bundling | ✅ Yes | ✅ Yes |
| AAR packaging | ❌ No | ✅ Yes |
| Multiple ReactHost | ❌ No | ✅ Yes |
| Old Architecture | ✅ Yes | ❌ No |
| New Architecture | ✅ Yes | ✅ Yes (required) |

**Summary:** Granite is specialized for library modules and requires New Architecture + Hermes.

---

## Installation

### Quick Start

**Step 1: Apply the plugin**

**Kotlin DSL** (`build.gradle.kts`):
```kotlin
plugins {
    id("com.android.library")
    id("run.granite.library") version "1.0.0"
}

granite {
    entryFile.set("src/main/js/index.js")
}
```

**Groovy DSL** (`build.gradle`):
```groovy
plugins {
    id 'com.android.library'
    id 'run.granite.library' version '1.0.0'
}

granite {
    entryFile = "src/main/js/index.js"
}
```

**Step 2: Root project plugin** (optional, for monorepo compatibility)

```kotlin
// root build.gradle.kts
plugins {
    id("run.granite.rootproject") version "1.0.0"
}
```

**Step 3: Build**

```bash
./gradlew :your-library:assembleDebug
```

### Using with npm (includeBuild)

For standard npm/node_modules setups, use `includeBuild` to resolve the plugin:

```kotlin
// settings.gradle.kts
pluginManagement {
    includeBuild("../node_modules/@granite-js/screen/gradle-plugin")
}
```

### Yarn PnP Users

If your project uses Yarn PnP (`nodeLinker: pnp`), you must unplug the screen package
before Gradle can resolve the plugin:

```bash
yarn unplug @granite-js/screen
```

Then reference the unplugged path:

```kotlin
// settings.gradle.kts
pluginManagement {
    includeBuild(".yarn/unplugged/@granite-js-screen-npm-VERSION-HASH/node_modules/@granite-js/screen/gradle-plugin")
}
```

---

## Native Module Autolinking (Critical)

Granite lacks a Settings Plugin, so native module projects must be registered in `settings.gradle.kts`. **Without this, autolinking will fail** and native modules won't be linked.

### Option 1: Use Official React Native Settings Plugin (Recommended)

```kotlin
// settings.gradle.kts
pluginManagement {
    repositories {
        mavenCentral()
        google()
    }
}

plugins {
    id("com.facebook.react.settings") version "0.84.0"
}

configure<com.facebook.react.ReactSettingsExtension> {
    autolinkLibrariesFromCommand()
}
```

**Why this works:** The official settings plugin registers all native module subprojects by executing `npx react-native config`, making them discoverable by Granite's autolinking task.

### Option 2: Manual Registration

```kotlin
// settings.gradle.kts
include(":react-native-gesture-handler")
project(":react-native-gesture-handler").projectDir =
    file("node_modules/react-native-gesture-handler/android")

include(":react-native-reanimated")
project(":react-native-reanimated").projectDir =
    file("node_modules/react-native-reanimated/android")
```

**What happens without registration:**

When `graniteAutolinking` runs, it calls `project.findProject(projectPath)` for each native module. If the subproject isn't registered in `settings.gradle.kts`, this returns `null` and the module is skipped with a warning:

```
[WARN] Native module ':react-native-gesture-handler' not found in project. Skipping autolinking.
```

---

## PrivateReactExtension Compatibility

In monorepo environments where both Granite and the official React Native Gradle Plugin coexist, Granite ensures compatibility through reflection-based handling of `PrivateReactExtension`:

**How it works:**

1. **Pre-creation:** Granite uses `Class.forName("com.facebook.react.internal.PrivateReactExtension")` to create the extension early
2. **Path configuration:** Sets correct root paths for React Native and node_modules
3. **Graceful coexistence:** If the extension already exists (created by official plugin), Granite only configures the root property
4. **Safe degradation:** If `ClassNotFoundException` occurs, logs a warning and continues

**Important:** `PrivateReactExtension` is a React Native internal API and may change between major versions. Verify compatibility when upgrading React Native.

```kotlin
// Internal implementation (informational only)
try {
    val extensionClass = Class.forName("com.facebook.react.internal.PrivateReactExtension")
    // Configure root paths...
} catch (e: ClassNotFoundException) {
    logger.warn("PrivateReactExtension not found. Monorepo compatibility disabled.")
}
```

---

## Configuration Reference

### Library Module Plugin (`granite { }`)

Configure the plugin using the `granite` DSL block:

```kotlin
granite {
    // JavaScript entry point
    entryFile.set("src/main/js/index.js")

    // Bundle output name
    bundleAssetName.set("index.android.bundle")

    // Enable/disable bundle compression
    bundleCompressionEnabled.set(true)

    // Target ABIs (production: arm64-v8a, armeabi-v7a only)
    nativeArchitectures.set(listOf("arm64-v8a", "armeabi-v7a"))

    // React Native directory (auto-detected)
    reactNativeDir.set(rootProject.file("node_modules/react-native"))

    // Node modules directory (auto-detected)
    nodeModulesDir.set(rootProject.file("node_modules"))

    // Dev server configuration (optional)
    devServerHost.set("localhost")
    devServerPort.set(8081)
}
```

### DSL Property Reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `entryFile` | `Property<String>` | `"src/main/js/index.js"` | JavaScript entry file path |
| `bundleAssetName` | `Property<String>` | `"index.android.bundle"` | Bundle file name in AAR |
| `reactNativeDir` | `Property<File>` | `rootProject.file("node_modules/react-native")` | React Native installation directory |
| `nodeModulesDir` | `Property<File>` | `rootProject.file("node_modules")` | Node modules directory |
| `bundleCompressionEnabled` | `Property<Boolean>` | `true` | Enable bundle compression |
| `nativeArchitectures` | `ListProperty<String>` | `["armeabi-v7a", "arm64-v8a", "x86", "x86_64"]` | Android ABIs to build |
| `reactNativeVersion` | `Property<String>` | Auto-detected from `node_modules` | React Native version |
| `devServerHost` | `Property<String>` | `null` | Metro dev server host (development only) |
| `devServerPort` | `Property<Int>` | `null` | Metro dev server port (development only) |

**Production-optimized configuration:**

```kotlin
granite {
    entryFile.set("src/main/js/index.js")
    bundleCompressionEnabled.set(true)
    // Only include 64-bit and 32-bit ARM (most devices)
    nativeArchitectures.set(listOf("arm64-v8a", "armeabi-v7a"))
}
```

### Root Project Plugin (`graniteRoot { }`)

Apply to the root project for monorepo dependency management:

```kotlin
// root build.gradle.kts
plugins {
    id("run.granite.rootproject") version "1.0.0"
}
```

**What it does:**
- Configures dependency substitution for React Native libraries
- Sets up `PrivateReactExtension` for path resolution
- Ensures consistent React Native versions across modules

---

## Gradle Tasks

Granite provides 5 main task groups:

### 1. Autolinking Tasks

**`graniteAutolinking`**
- Discovers native modules in `node_modules/`
- Generates `PackageList.java` (Java native module registry)
- Generates `autolinking.cpp/h` (C++ JNI registration)
- Generates `Android-autolinking.cmake` (CMake build configuration)
- **Output:** `build/generated/autolinking/`
- **Runs:** Before `preBuild`

### 2. Codegen Tasks

**`graniteCodegenSchema`**
- Scans JavaScript specs for TurboModule/Fabric definitions
- Generates unified schema JSON
- **Output:** `build/generated/codegen/schema.json`

**`graniteCodegenArtifacts`**
- Generates Java interfaces and C++ implementations
- Creates TurboModule and Fabric component bindings
- **Output:** `build/generated/codegen/java/` and `jni/`
- **Runs:** Before Kotlin/Java compilation

### 3. Bundling Tasks

**`graniteBundleDebug`** / **`graniteBundleRelease`**
- Runs Metro bundler to create JavaScript bundle
- Compiles to Hermes bytecode (`.hbc`)
- Applies minification and optimization (Release only)
- **Output:** `build/generated/assets/{variant}/index.android.bundle`

### 4. Packaging Tasks

**`granitePackageAssetsDebug`** / **`granitePackageAssetsRelease`**
- Copies bundle to AAR asset directory
- Packages images and drawable resources
- **Output:** `src/{variant}/assets/`

### 5. Task Execution Flow

```
npm install
    ↓
graniteAutolinking → preBuild → compileKotlin
    ↓                               ↓
graniteCodegenSchema         externalNativeBuild (CMake)
    ↓                               ↓
graniteCodegenArtifacts ────────────┘
                                    ↓
                              AAR Creation
                                    ↑
graniteBundleRelease → granitePackageAssets
```

**Manual bundle workflow:**

```bash
# Generate JavaScript bundle with Hermes compilation
./gradlew graniteBundleRelease

# Package assets into AAR
./gradlew granitePackageAssetsRelease

# Build final AAR
./gradlew bundleReleaseAar
```

**One-liner for CI/CD:**

```bash
./gradlew graniteBundleRelease granitePackageAssetsRelease bundleReleaseAar
```

---

## Version Compatibility

| Component | Minimum Version | Tested Version |
|-----------|----------------|----------------|
| React Native | 0.84.0 | 0.84.0+ |
| Android Gradle Plugin | 8.1.0 | 8.6.1 |
| Gradle | 8.0 | 8.9 |
| JDK | 17 | 17 |
| Kotlin | 1.9.0 | 2.1.21 |
| SoLoader | 0.12.1 | 0.12.1 |
| Hermes | (bundled with RN) | v96 |

**Required settings:**

```properties
# gradle.properties
newArchEnabled=true
```

---

## Architecture

### Generated Code Structure

```
build/
├── generated/
│   ├── autolinking/
│   │   └── src/main/
│   │       ├── java/com/facebook/react/
│   │       │   └── PackageList.java          # Java TurboModule registry
│   │       └── jni/
│   │           ├── autolinking.cpp           # C++ JNI registration
│   │           ├── autolinking.h
│   │           └── Android-autolinking.cmake # CMake configuration
│   ├── codegen/
│   │   ├── schema.json                       # Unified TurboModule/Fabric schema
│   │   ├── java/                             # Generated Java interfaces
│   │   └── jni/                              # Generated C++ implementations
│   └── assets/
│       ├── debug/index.android.bundle        # Debug JS bundle
│       └── release/index.android.bundle.hbc  # Hermes bytecode
└── outputs/
    └── aar/
        └── your-library-release.aar          # Final AAR with bundled assets
```

### AAR Contents

```
your-library.aar
├── jni/                          # Native libraries
│   ├── arm64-v8a/
│   │   └── libreactnative.so     # React Native runtime (64-bit ARM)
│   └── armeabi-v7a/
│       └── libreactnative.so     # React Native runtime (32-bit ARM)
├── assets/
│   └── index.android.bundle      # Hermes bytecode bundle
├── res/
│   └── drawable/                 # Image assets from JS bundle
└── classes.jar                   # Compiled Kotlin/Java code
```

---

## Troubleshooting

### Common Issues

**Issue: Native module not linked**

```
[WARN] Native module ':react-native-gesture-handler' not found in project. Skipping autolinking.
```

**Solution:** Register native modules in `settings.gradle.kts` (see [Native Module Autolinking](#native-module-autolinking-critical))

---

**Issue: `Unresolved reference: PackageList`**

```
e: Unresolved reference: PackageList
```

**Solution:** Run autolinking manually:
```bash
./gradlew graniteAutolinking
ls -la build/generated/autolinking/src/main/java/
```

---

**Issue: JavaScript entry file not found**

```
JavaScript entry file not found: /path/to/index.js
```

**Solution:** Ensure `entryFile` points to an existing file:
```kotlin
granite {
    entryFile.set("src/main/js/index.js")  // Must exist!
}
```

---

**Issue: React Native not found**

```
React Native directory not found: /path/to/node_modules/react-native
```

**Solution:** Install dependencies:
```bash
npm install  # or yarn install
```

---

**Issue: Hermes compilation fails**

```
Failed to compile bundle to Hermes bytecode
```

**Solution:** Verify Hermes is enabled and check JavaScript syntax:
```bash
# Test Metro bundler directly
npx react-native start --reset-cache
```

---

### Debug Commands

```bash
# View full stack traces
./gradlew build --stacktrace

# Verbose logging
./gradlew build --info

# Debug logging
./gradlew build --debug

# Dependency tree
./gradlew :your-library:dependencies

# Task execution order
./gradlew :your-library:assembleDebug --dry-run
```

---

## FAQ

**Q: Why is New Architecture required?**

A: Granite is optimized for multi-module architectures and multiple ReactHost scenarios. New Architecture's TurboModules and Fabric provide module isolation and type safety necessary for safe library module usage. Old Architecture lacks these guarantees.

---

**Q: Can I use JSC instead of Hermes?**

A: No. Granite only supports Hermes. Hermes is optimized for React Native with faster startup, smaller bundle size, and lower memory usage. Hermes bytecode also provides source code protection.

---

**Q: Can I use Granite in multiple library modules?**

A: Yes! Each library module must have a unique Android namespace. Each module gets its own ReactHost and codegen artifacts.

```kotlin
// module-a/build.gradle.kts
android { namespace = "com.example.module.a" }

// module-b/build.gradle.kts
android { namespace = "com.example.module.b" }
```

---

**Q: Can I use Granite in application modules?**

A: No. Granite is library-module only. For application modules, use the official `com.facebook.react` plugin.

---

**Q: Should I commit generated code to Git?**

A: No. All files in `build/` are auto-generated during build. Add `build/` to `.gitignore`.

---

**Q: What's the recommended production configuration?**

A:
```kotlin
granite {
    entryFile.set("src/main/js/index.js")
    bundleCompressionEnabled.set(true)
    nativeArchitectures.set(listOf("arm64-v8a", "armeabi-v7a"))
}
```

Exclude x86/x86_64 to reduce AAR size. Enable compression. Hermes is always enabled.

---

## License

Apache License 2.0

---

## Contributing

Contributions are welcome!

- **Issues:** [GitHub Issues](https://github.com/toss/granite/issues)
- **Discussions:** [GitHub Discussions](https://github.com/toss/granite/discussions)

---

**Repository:** [https://github.com/toss/granite](https://github.com/toss/granite)
