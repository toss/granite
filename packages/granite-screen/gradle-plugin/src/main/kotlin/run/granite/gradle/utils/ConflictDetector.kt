package run.granite.gradle.utils

import org.gradle.api.Project

/**
 * Detects conflicts with the standard React Native Gradle Plugin.
 *
 * The Granite plugin cannot coexist with the unpatched React Native Gradle Plugin
 * because both configure React Native build processes (codegen, autolinking, bundling).
 * Only one library module per dependency tree should use the Granite plugin.
 */
object ConflictDetector {

  private const val REACT_NATIVE_PLUGIN_ID = "com.facebook.react"
  private const val REACT_NATIVE_APP_PLUGIN_ID = "com.facebook.react.application"
  private const val REACT_NATIVE_LIBRARY_PLUGIN_ID = "com.facebook.react.library"

  /**
   * Validates that the React Native Gradle Plugin is not applied to the same project.
   *
   * @param project The Gradle project
   * @throws IllegalStateException if conflicting plugin is detected
   */
  fun validateNoConflicts(project: Project) {
    // Check if React Native plugin is applied
    val hasReactPlugin = project.pluginManager.hasPlugin(REACT_NATIVE_PLUGIN_ID)
    val hasReactAppPlugin = project.pluginManager.hasPlugin(REACT_NATIVE_APP_PLUGIN_ID)
    val hasReactLibraryPlugin = project.pluginManager.hasPlugin(REACT_NATIVE_LIBRARY_PLUGIN_ID)

    if (hasReactPlugin || hasReactAppPlugin || hasReactLibraryPlugin) {
      val detectedPlugin = when {
        hasReactPlugin -> REACT_NATIVE_PLUGIN_ID
        hasReactAppPlugin -> REACT_NATIVE_APP_PLUGIN_ID
        else -> REACT_NATIVE_LIBRARY_PLUGIN_ID
      }

      error(
        """
                |Granite plugin cannot coexist with the React Native Gradle Plugin.
                |
                |Detected conflicting plugin: $detectedPlugin
                |Project: ${project.path}
                |
                |The Granite plugin provides its own implementation of React Native build tasks
                |(codegen, autolinking, bundling) and cannot work alongside the standard plugin.
                |
                |Solutions:
                |  1. Remove the React Native plugin from your library module:
                |     Remove: id("$detectedPlugin")
                |     Keep: id("run.granite.library")
                |
                |  2. If you need both plugins in your project:
                |     - Use Granite plugin ONLY in the library module that packages React Native
                |     - Application modules should NOT use either plugin
                |     - Only ONE library module per dependency tree can use Granite plugin
                |
                |Example (library module build.gradle.kts):
                |  plugins {
                |      id("com.android.library")
                |      id("run.granite.library")  // Use Granite, not React Native plugin
                |  }
                |
                |Example (app module build.gradle.kts):
                |  dependencies {
                |      implementation(project(":your-library-module"))
                |      // No React Native plugin needed - library provides everything
                |  }
        """.trimMargin(),
      )
    }

    // Warn if multiple library modules might be using Granite plugin
    // (This is detected by checking if dependencies include other Granite-enabled modules)
    detectMultipleGraniteModules(project)

    project.logger.lifecycle("Granite plugin: Conflict detection passed")
  }

  /**
   * Detects if multiple library modules in the dependency tree are using Granite plugin.
   *
   * This is a warning, not an error, because it may be intentional in some cases.
   */
  private fun detectMultipleGraniteModules(project: Project) {
    // Check if any dependencies also apply the Granite plugin
    val graniteModuleCount = project.rootProject.subprojects.count { subproject ->
      subproject.pluginManager.hasPlugin("run.granite.library")
    }

    if (graniteModuleCount > 1) {
      project.logger.warn(
        """
                |
                |⚠️ WARNING: Multiple modules in this project are using the Granite plugin.
                |
                |Detected $graniteModuleCount modules with 'run.granite.library' plugin applied.
                |
                |Best practice: Only ONE library module per dependency tree should use Granite plugin.
                |Multiple Granite modules can cause:
                |  - Duplicate React Native initialization
                |  - Conflicting native module registration
                |  - Increased AAR size
                |  - Build performance issues
                |
                |If this is intentional, ensure the modules are not in the same dependency tree.
                |
        """.trimMargin(),
      )
    }
  }

  /**
   * Checks if a project has the React Native plugin applied.
   *
   * @param project The Gradle project to check
   * @return true if React Native plugin is applied, false otherwise
   */
  fun hasReactNativePlugin(project: Project): Boolean = project.pluginManager.hasPlugin(REACT_NATIVE_PLUGIN_ID) ||
    project.pluginManager.hasPlugin(REACT_NATIVE_APP_PLUGIN_ID) ||
    project.pluginManager.hasPlugin(REACT_NATIVE_LIBRARY_PLUGIN_ID)
}
