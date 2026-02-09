package run.granite.gradle.models

/**
 * Root configuration object parsed from `react-native config` JSON output.
 *
 * Provides filtered views of dependencies for different code generation purposes:
 * - androidDependencies(): All modules with Android native code
 * - javaModules(): Modules with Java TurboModule implementations
 * - cxxModules(): Modules with C++ TurboModule implementations
 * - fabricModules(): Modules with Fabric components
 * - cmakeModules(): Modules with CMake configuration
 */
data class AutolinkingConfig(
  val project: ProjectInfo,
  val dependencies: Map<String, DependencyConfig>,
) {
  /**
   * Filters dependencies to only those with Android native code.
   * Excludes JavaScript-only packages.
   * Reads each module's package.json to check for includesGeneratedCode flag.
   */
  fun androidDependencies(): List<NativeModule> = dependencies.mapNotNull { (name, config) ->
    config.platforms?.android?.let { androidConfig ->
      NativeModule.from(name, androidConfig, config.root)
    }
  }

  /**
   * Returns modules that have Java TurboModule implementations.
   * Identified by non-null packageImportPath and packageInstance.
   */
  fun javaModules(): List<NativeModule> = androidDependencies().filter { it.hasJavaImplementation }

  /**
   * Returns modules that have C++ TurboModule implementations.
   * Identified by non-null cxxModuleHeaderName.
   */
  fun cxxModules(): List<NativeModule> = androidDependencies().filter { it.hasCxxImplementation }

  /**
   * Returns modules that have Fabric components.
   * Identified by non-empty componentDescriptors array.
   */
  fun fabricModules(): List<NativeModule> = androidDependencies().filter { it.hasFabricComponents }

  /**
   * Returns modules that have CMake configuration.
   * Identified by non-null cmakeListsPath or cxxModuleCMakeListsPath.
   */
  fun cmakeModules(): List<NativeModule> = androidDependencies().filter { it.hasCMakeConfiguration }
}

/**
 * Metadata about the React Native project itself.
 * Used for entry point generation.
 */
data class ProjectInfo(
  val name: String?,
  val version: String?,
  val ios: Map<String, Any>?,
  val android: AndroidProjectConfig?,
)

/**
 * Android project configuration extracted from react-native config.
 * packageName is required for entry point generation.
 */
data class AndroidProjectConfig(
  val sourceDir: String?,
  val manifestPath: String?,
  val packageName: String?,
)

/**
 * Top-level configuration for a single dependency.
 */
data class DependencyConfig(
  val name: String,
  val root: String,
  val platforms: PlatformConfig?,
)

/**
 * Platform-specific configuration container.
 */
data class PlatformConfig(
  val ios: Map<String, Any>?,
  val android: AndroidDependencyConfig?,
)
