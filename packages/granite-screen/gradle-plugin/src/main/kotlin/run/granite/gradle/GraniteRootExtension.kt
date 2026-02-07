package run.granite.gradle

import org.gradle.api.Project
import org.gradle.api.provider.Property
import run.granite.gradle.config.DependencyCoordinates
import run.granite.gradle.utils.ReactNativeVersionReader
import java.io.File

/**
 * DSL configuration extension for Granite Root Project plugin.
 *
 * Configure the plugin in your root build.gradle.kts:
 * ```
 * graniteRoot {
 *     // Optional: Explicit version override (auto-detected from node_modules if not set)
 *     // reactNativeVersion.set("0.84.0")
 *     // hermesVersion.set("250829098.0.6")
 *
 *     // Optional: Override Maven group (for custom Maven repositories)
 *     // reactGroup.set("com.facebook.react")
 *     // hermesGroup.set("com.facebook.hermes")
 * }
 * ```
 */
abstract class GraniteRootExtension(private val project: Project) {

  /**
   * React Native version (auto-detected from node_modules if not set)
   */
  abstract val reactNativeVersion: Property<String>

  /**
   * Hermes version (auto-detected from node_modules if not set)
   */
  abstract val hermesVersion: Property<String>

  /**
   * React Native Maven group.
   * Default: com.facebook.react
   */
  abstract val reactGroup: Property<String>

  /**
   * Hermes Maven group.
   * Default: com.facebook.hermes
   */
  abstract val hermesGroup: Property<String>

  /**
   * Location of the node_modules directory.
   * Default: rootProject.file("node_modules")
   */
  abstract val nodeModulesDir: Property<File>

  init {
    // Set default conventions
    reactGroup.convention(DependencyCoordinates.DEFAULT_REACT_GROUP)
    hermesGroup.convention(DependencyCoordinates.DEFAULT_HERMES_GROUP)
    nodeModulesDir.convention(project.file("node_modules"))
    // reactNativeVersion and hermesVersion are intentionally left without conventions
    // They will be auto-detected if not explicitly set
  }

  /**
   * Gets the resolved DependencyCoordinates.
   *
   * If versions are explicitly set, uses those values.
   * Otherwise, auto-detects from node_modules/react-native.
   *
   * @return DependencyCoordinates for dependency substitution
   * @throws IllegalStateException if auto-detection fails and no explicit versions set
   */
  internal fun getCoordinates(): DependencyCoordinates {
    val reactNativeDir = nodeModulesDir.get().resolve("react-native")

    // Auto-detect base coordinates if needed
    val baseCoordinates = if (!reactNativeVersion.isPresent || !hermesVersion.isPresent) {
      if (!reactNativeDir.exists()) {
        error(
          """
                    |React Native directory not found: ${reactNativeDir.absolutePath}
                    |
                    |Either set versions explicitly in graniteRoot { } or ensure node_modules/react-native exists.
                    |
                    |Example:
                    |  graniteRoot {
                    |      reactNativeVersion.set("0.84.0")
                    |      hermesVersion.set("250829098.0.6")
                    |  }
          """.trimMargin(),
        )
      }
      ReactNativeVersionReader.readCoordinates(reactNativeDir)
    } else {
      null
    }

    // Build final coordinates: explicit > auto-detected
    return DependencyCoordinates(
      reactVersion = reactNativeVersion.orNull ?: baseCoordinates!!.reactVersion,
      hermesVersion = baseCoordinates?.hermesVersion ?: "",
      hermesV1Version = hermesVersion.orNull ?: baseCoordinates!!.hermesV1Version,
      reactGroup = reactGroup.get(),
      hermesGroup = hermesGroup.get(),
    )
  }
}
