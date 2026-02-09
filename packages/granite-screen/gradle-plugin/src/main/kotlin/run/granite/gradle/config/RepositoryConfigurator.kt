package run.granite.gradle.config

import org.gradle.api.Project
import run.granite.gradle.GraniteExtension
import java.io.File

/**
 * Configures Maven repositories for React Native dependencies.
 *
 * This configurator automatically adds required repositories:
 * - Maven Central (for React Native, Hermes, SoLoader)
 * - Google Maven (for Android dependencies)
 * - React Native Maven repository (node_modules/react-native/android)
 * - JSC/Hermes Maven repository (for JavaScript engines)
 * - Project-specific repositories (if configured)
 */
class RepositoryConfigurator(
  private val project: Project,
  private val extension: GraniteExtension,
) {

  /**
   * Configures all required Maven repositories.
   *
   * Called during plugin application to ensure repositories are available
   * before dependency resolution.
   *
   * Adds repositories to all projects (including root) so that third-party modules
   * can resolve react-native dependencies.
   */
  fun configure() {
    project.logger.lifecycle("Configuring Maven repositories for React Native")

    val reactNativeDir = extension.getReactNativeDirResolved()
    val nodeModulesDir = extension.getNodeModulesDirResolved()

    // Add repositories to all projects (official RN plugin approach)
    project.rootProject.allprojects.forEach { eachProject ->
      // Add standard repositories
      addStandardRepositories(eachProject)

      // Add React Native Maven repository
      addReactNativeMavenRepository(eachProject, reactNativeDir)

      // Add Android Maven repository from node_modules
      addAndroidMavenRepository(eachProject, nodeModulesDir)

      // Add JSC Maven repository (even though we use Hermes, some RN components may reference it)
      addJscMavenRepository(eachProject, nodeModulesDir)
    }
  }

  /**
   * Adds standard Maven repositories (Google, Maven Central).
   */
  private fun addStandardRepositories(targetProject: Project) {
    targetProject.repositories.apply {
      // Google Maven for Android dependencies
      if (findByName("Google") == null) {
        google()
        project.logger.debug("[${targetProject.name}] Added repository: Google Maven")
      }

      // Maven Central for React Native and Hermes
      if (findByName("MavenRepo") == null) {
        mavenCentral()
        project.logger.debug("[${targetProject.name}] Added repository: Maven Central")
      }
    }
  }

  /**
   * Adds React Native Maven repository from node_modules.
   *
   * This repository contains React Native Android artifacts.
   */
  private fun addReactNativeMavenRepository(targetProject: Project, reactNativeDir: File) {
    val reactNativeAndroidDir = reactNativeDir.resolve("ReactAndroid")

    if (!reactNativeAndroidDir.exists()) {
      project.logger.warn(
        "React Native Android directory not found: ${reactNativeAndroidDir.absolutePath}",
      )
      return
    }

    // Prevent duplicate additions
    if (targetProject.repositories.findByName("ReactNative") != null) {
      return
    }

    targetProject.repositories.maven {
      name = "ReactNative"
      setUrl(reactNativeAndroidDir)
    }

    project.logger.debug("[${targetProject.name}] Added repository: React Native Maven (${reactNativeAndroidDir.absolutePath})")
  }

  /**
   * Adds Android Maven repository from node_modules.
   *
   * This repository contains prebuilt React Native Android artifacts.
   */
  private fun addAndroidMavenRepository(targetProject: Project, nodeModulesDir: File) {
    val androidMavenDir = nodeModulesDir.resolve("react-native/android")

    if (androidMavenDir.exists()) {
      // Prevent duplicate additions
      if (targetProject.repositories.findByName("ReactNativeAndroid") != null) {
        return
      }

      targetProject.repositories.maven {
        name = "ReactNativeAndroid"
        setUrl(androidMavenDir)
      }

      project.logger.debug("[${targetProject.name}] Added repository: React Native Android Maven (${androidMavenDir.absolutePath})")
    }
  }

  /**
   * Adds JSC Maven repository from node_modules.
   *
   * Even though Hermes is required, some React Native components may reference JSC.
   */
  private fun addJscMavenRepository(targetProject: Project, nodeModulesDir: File) {
    val jscAndroidDir = nodeModulesDir.resolve("jsc-android/dist")

    if (jscAndroidDir.exists()) {
      // Prevent duplicate additions
      if (targetProject.repositories.findByName("JSC") != null) {
        return
      }

      targetProject.repositories.maven {
        name = "JSC"
        setUrl(jscAndroidDir)
      }

      project.logger.debug("[${targetProject.name}] Added repository: JSC Maven (${jscAndroidDir.absolutePath})")
    } else {
      // JSC may not be installed if using Hermes exclusively
      project.logger.debug("[${targetProject.name}] JSC Maven repository not found (not required for Hermes builds)")
    }
  }
}
