package run.granite.gradle

import org.gradle.api.Project
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import java.io.File

/**
 * DSL configuration extension for Granite plugin.
 *
 * Configure the plugin in your build.gradle.kts:
 * ```
 * granite {
 *     entryFile.set("src/main/js/index.js")
 *     bundleAssetName.set("index.android.bundle")
 *     reactNativeDir.set(file("node_modules/react-native"))
 * }
 * ```
 */
abstract class GraniteExtension(private val project: Project) {

    /**
     * JavaScript entry file path (relative to project root).
     * Default: "src/main/js/index.js"
     */
    abstract val entryFile: Property<String>

    /**
     * Bundle asset name for the JavaScript bundle.
     * Default: "index.android.bundle"
     */
    abstract val bundleAssetName: Property<String>

    /**
     * React Native root directory.
     * Default: project.rootProject.file("node_modules/react-native")
     */
    abstract val reactNativeDir: Property<File>

    /**
     * Node modules directory for dependency resolution.
     * Default: project.rootProject.file("node_modules")
     */
    abstract val nodeModulesDir: Property<File>

    /**
     * Enable bundle compression for release builds.
     * Default: true
     */
    abstract val bundleCompressionEnabled: Property<Boolean>

    /**
     * Android ABI architectures to build.
     * Default: ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"]
     */
    abstract val nativeArchitectures: ListProperty<String>

    /**
     * React Native version (detected automatically from package.json).
     * Can be overridden manually if needed.
     * Default: Auto-detected from node_modules/react-native/package.json
     */
    abstract val reactNativeVersion: Property<String>

    /**
     * Development server host for Metro bundler.
     * Default: null (not configured, will use React Native defaults)
     *
     * Common values:
     * - "localhost" for development on same machine
     * - "10.0.2.2" for Android emulator
     * - "192.168.x.x" for physical devices on local network
     */
    abstract val devServerHost: Property<String>

    /**
     * Development server port for Metro bundler.
     * Default: null (not configured, will use React Native default of 8081)
     */
    abstract val devServerPort: Property<Int>

    init {
        // Set defaults
        entryFile.convention("src/main/js/index.js")
        bundleAssetName.convention("index.android.bundle")
        reactNativeDir.convention(project.rootProject.file("node_modules/react-native"))
        nodeModulesDir.convention(project.rootProject.file("node_modules"))
        bundleCompressionEnabled.convention(true)
        nativeArchitectures.convention(listOf("armeabi-v7a", "arm64-v8a", "x86", "x86_64"))
        reactNativeVersion.convention(detectReactNativeVersion())
        // devServerHost and devServerPort are intentionally left without conventions
        // They remain null unless explicitly configured by the user
    }

    /**
     * Validates the extension configuration.
     * Called during project evaluation to catch configuration errors early.
     *
     * Note: entryFile validation is deferred to BundleTask execution time,
     * allowing projects where JS files are in separate repositories.
     */
    internal fun validate() {
        // Note: entryFile validation moved to BundleTask.execute()
        // This allows flexibility for projects with JS in separate repos

        // Validate React Native directory
        val reactNativeDirResolved = getReactNativeDirResolved()
        if (!reactNativeDirResolved.exists() || !reactNativeDirResolved.isDirectory) {
            error(
                """
                |React Native directory not found: ${reactNativeDirResolved.absolutePath}
                |
                |Configured React Native directory: ${reactNativeDir.get().absolutePath}
                |
                |Solutions:
                |  1. Run 'npm install' or 'yarn install' to install React Native
                |  2. Verify React Native is listed in your package.json dependencies
                |  3. Configure the React Native directory in build.gradle.kts:
                |     granite {
                |         reactNativeDir.set(file("node_modules/react-native"))
                |     }
                |
                |Project: ${project.path}
                """.trimMargin()
            )
        }

        // Validate package.json exists in React Native directory
        val packageJsonFile = reactNativeDirResolved.resolve("package.json")
        if (!packageJsonFile.exists()) {
            error(
                """
                |React Native package.json not found: ${packageJsonFile.absolutePath}
                |
                |The React Native directory appears to be invalid or incomplete.
                |
                |Solution: Run 'npm install' or 'yarn install' to reinstall React Native
                |
                |Project: ${project.path}
                """.trimMargin()
            )
        }

        // Note: Hermes is always enabled. JSC is not supported.

        // Validate native architectures
        val validAbis = setOf("armeabi-v7a", "arm64-v8a", "x86", "x86_64")
        val configuredAbis = nativeArchitectures.get()

        for (abi in configuredAbis) {
            if (abi !in validAbis) {
                error(
                    """
                    |Invalid Android ABI architecture: $abi
                    |
                    |Valid ABIs: ${validAbis.joinToString(", ")}
                    |Configured ABIs: ${configuredAbis.joinToString(", ")}
                    |
                    |Solution: Update nativeArchitectures in build.gradle.kts:
                    |  granite {
                    |      nativeArchitectures.set(listOf("arm64-v8a", "armeabi-v7a"))
                    |  }
                    |
                    |Project: ${project.path}
                    """.trimMargin()
                )
            }
        }

        // Validate node_modules directory exists
        val nodeModulesDirResolved = getNodeModulesDirResolved()
        if (!nodeModulesDirResolved.exists() || !nodeModulesDirResolved.isDirectory) {
            error(
                """
                |Node modules directory not found: ${nodeModulesDirResolved.absolutePath}
                |
                |Solutions:
                |  1. Run 'npm install' or 'yarn install' to install dependencies
                |  2. Configure the node_modules directory in build.gradle.kts:
                |     granite {
                |         nodeModulesDir.set(file("../node_modules"))
                |     }
                |
                |Project: ${project.path}
                """.trimMargin()
            )
        }

        project.logger.lifecycle("Granite extension configuration validated successfully")
    }

    /**
     * Gets the resolved entry file.
     */
    internal fun getEntryFileResolved(): File {
        return project.file(entryFile.get())
    }

    /**
     * Gets the resolved React Native directory.
     */
    internal fun getReactNativeDirResolved(): File {
        return reactNativeDir.get()
    }

    /**
     * Gets the resolved node modules directory.
     */
    internal fun getNodeModulesDirResolved(): File {
        return nodeModulesDir.get()
    }

    /**
     * Detects the React Native version from package.json.
     * Returns "0.0.0" if detection fails (will be validated later).
     */
    private fun detectReactNativeVersion(): String {
        return try {
            val packageJsonFile = project.rootProject.file("node_modules/react-native/package.json")
            if (!packageJsonFile.exists()) {
                "0.0.0" // Will be validated in validate()
            } else {
                // Simple regex-based extraction to avoid dependency on Gson during convention setup
                val content = packageJsonFile.readText()
                val versionRegex = """"version"\s*:\s*"([^"]+)"""".toRegex()
                versionRegex.find(content)?.groupValues?.get(1) ?: "0.0.0"
            }
        } catch (e: Exception) {
            project.logger.debug("Failed to detect React Native version: ${e.message}")
            "0.0.0"
        }
    }
}
