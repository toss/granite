package run.granite.gradle.config

import com.android.build.gradle.LibraryExtension
import org.gradle.api.Project
import run.granite.gradle.GraniteExtension
import java.io.File

/**
 * Configures Android NDK and CMake build settings for React Native native modules.
 *
 * This configurator:
 * - Enables Prefab for consuming native library dependencies
 * - Configures externalNativeBuild with CMake
 * - Configures Android ABIs
 * - Sets up CMake arguments for React Native
 *
 * Native libraries (.so files) are built by CMake and packaged in the AAR.
 * App modules can consume these libraries via Prefab without additional configuration.
 */
class NdkConfigurator(
  private val project: Project,
  private val extension: GraniteExtension,
  private val androidExtension: LibraryExtension,
) {

  /**
   * Configures all NDK and CMake settings.
   */
  fun configure() {
    project.logger.lifecycle("Configuring NDK and CMake for React Native native modules")

    // Enable Prefab
    configurePrefab()

    // Configure externalNativeBuild with CMake
    configureCMake()

    // Configure ABIs
    configureAbis()

    project.logger.lifecycle("NDK configuration complete")
  }

  /**
   * Enables Prefab for packaging native libraries.
   *
   * Prefab allows the AAR to export native libraries (.so files) that can be
   * consumed by app modules without manual configuration.
   *
   * Implementation details.
   */
  private fun configurePrefab() {
    androidExtension.buildFeatures.prefab = true

    project.logger.debug("Prefab enabled for native library packaging")
  }

  /**
   * Configures externalNativeBuild with CMake.
   *
   * Sets up CMake configuration for building React Native and custom native modules.
   *
   * Implementation details.
   */
  private fun configureCMake() {
    val cmakeListsFile = project.file("CMakeLists.txt")

    if (!cmakeListsFile.exists()) {
      project.logger.warn(
        """
                |CMakeLists.txt not found: ${cmakeListsFile.absolutePath}
                |
                |Native module builds will be skipped. If your library has C++ native modules,
                |create a CMakeLists.txt file at the project root.
        """.trimMargin(),
      )
      return
    }

    androidExtension.externalNativeBuild.cmake {
      path = cmakeListsFile

      // CMake version (compatible with React Native 0.81+)
      version = "3.22.1"
    }

    androidExtension.defaultConfig.externalNativeBuild.cmake {
      // Add CMake arguments for React Native
      val codegenJniDir = project.layout.buildDirectory
        .dir("generated/codegen/jni")
        .get().asFile.absolutePath

      val reactNativeDir = extension.getReactNativeDirResolved().absolutePath
      val nodeModulesDir = extension.getNodeModulesDirResolved().absolutePath
      // For RN 0.71-0.75, use ReactAndroid; for RN 0.76+, use android
      val reactAndroidDir = "$reactNativeDir/ReactAndroid"
      val projectBuildDir = project.layout.buildDirectory.get().asFile.absolutePath
      val projectRootDir = project.rootDir.absolutePath

      arguments(
        "-DREACT_NATIVE_DIR=$reactNativeDir",
        "-DREACT_ANDROID_DIR=$reactAndroidDir",
        "-DNODE_MODULES_DIR=$nodeModulesDir",
        "-DCODEGEN_JNI_DIR=$codegenJniDir",
        "-DPROJECT_BUILD_DIR=$projectBuildDir",
        "-DPROJECT_ROOT_DIR=$projectRootDir",
        "-DANDROID_STL=c++_shared",
      )

      project.logger.debug("CMake configured with React Native arguments")
    }
  }

  /**
   * Configures Android ABIs (architectures) to build.
   *
   * By default, builds for all ABIs. Users can customize via GraniteExtension.
   *
   * Implementation details.
   */
  private fun configureAbis() {
    val abis = extension.nativeArchitectures.get()

    if (abis.isEmpty()) {
      project.logger.warn("No ABIs configured - using default (all ABIs)")
      return
    }

    androidExtension.defaultConfig.ndk {
      abiFilters.addAll(abis)
    }

    project.logger.lifecycle("Configured ABIs: ${abis.joinToString(", ")}")
  }
}
