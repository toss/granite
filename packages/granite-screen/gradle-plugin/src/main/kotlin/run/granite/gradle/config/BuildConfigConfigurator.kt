package run.granite.gradle.config

import com.android.build.gradle.LibraryExtension
import org.gradle.api.Project
import run.granite.gradle.GraniteExtension

/**
 * Configurator for Android BuildConfig field generation.
 *
 * Generates BuildConfig fields to expose:
 * - Feature flags (New Architecture, Hermes always enabled)
 * - Development server configuration
 * - React Native version information
 *
 * These constants are available at runtime and compile-time for conditional logic.
 */
class BuildConfigConfigurator(
  private val project: Project,
  private val extension: GraniteExtension,
) {

  /**
   * Configures BuildConfig fields for the Android library.
   *
   * Adds fields that are available in generated BuildConfig class:
   * - IS_HERMES_ENABLED: Boolean flag for Hermes JavaScript engine (always true)
   * - IS_NEW_ARCHITECTURE_ENABLED: Boolean flag for TurboModules/Fabric (always true)
   * - REACT_NATIVE_VERSION: String with React Native version
   */
  fun configure(androidExtension: LibraryExtension) {
    androidExtension.apply {
      // Enable BuildConfig generation for library module
      buildFeatures.buildConfig = true

      // Add common BuildConfig fields
      defaultConfig {
        // Hermes JavaScript engine flag (always enabled)
        buildConfigField(
          "boolean",
          "IS_HERMES_ENABLED",
          "true",
        )

        // New Architecture (TurboModules + Fabric) flag (always enabled)
        buildConfigField(
          "boolean",
          "IS_NEW_ARCHITECTURE_ENABLED",
          "true",
        )

        // React Native version
        buildConfigField(
          "String",
          "REACT_NATIVE_VERSION",
          "\"${extension.reactNativeVersion.get()}\"",
        )

        // Bundle asset name
        buildConfigField(
          "String",
          "BUNDLE_ASSET_NAME",
          "\"${extension.bundleAssetName.get()}\"",
        )
      }
    }

    project.logger.lifecycle("BuildConfig fields configured for ${project.name}")
  }
}
