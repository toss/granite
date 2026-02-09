package run.granite.gradle.utils

import com.google.gson.Gson
import com.google.gson.JsonObject
import org.gradle.api.Project
import run.granite.gradle.config.DependencyCoordinates
import java.io.File
import java.util.Properties

/**
 * Reads and resolves React Native version information.
 *
 * This utility reads version information from:
 * - node_modules/react-native/package.json
 * - User-specified reactNativeDir in GraniteExtension
 *
 * Version resolution is used to:
 * - Configure compatible dependency versions (hermes-android, soloader, etc.)
 * - Locate React Native codegen and bundler tools
 * - Validate minimum version requirements
 */
object ReactNativeVersionReader {

  private const val MINIMUM_RN_VERSION = "0.81.0"
  private const val INTERNAL_VERSION_NAME = "VERSION_NAME"
  private const val INTERNAL_PUBLISHING_GROUP = "react.internal.publishingGroup"
  private const val DEFAULT_INTERNAL_PUBLISHING_GROUP = "com.facebook.react"

  // Hermes version property keys
  private const val INTERNAL_HERMES_VERSION_NAME = "HERMES_VERSION_NAME"
  private const val INTERNAL_HERMES_V1_VERSION_NAME = "HERMES_V1_VERSION_NAME"
  private const val INTERNAL_HERMES_PUBLISHING_GROUP = "react.internal.hermesPublishingGroup"
  private const val DEFAULT_HERMES_PUBLISHING_GROUP = "com.facebook.hermes"

  /**
   * Reads React Native version from the specified directory.
   *
   * @param reactNativeDir The React Native installation directory
   * @return The version string (e.g., "0.81.6")
   * @throws IllegalStateException if version cannot be read
   */
  fun readVersion(reactNativeDir: File): String {
    val packageJsonFile = reactNativeDir.resolve("package.json")

    if (!packageJsonFile.exists()) {
      error(
        """
                |React Native package.json not found.
                |
                |Expected location: ${packageJsonFile.absolutePath}
                |React Native directory: ${reactNativeDir.absolutePath}
                |
                |Solutions:
                |  1. Run 'npm install' or 'yarn install' to install React Native
                |  2. Verify React Native is listed in your package.json dependencies
                |  3. Configure the React Native directory in your build.gradle.kts:
                |     granite {
                |         reactNativeDir.set(file("path/to/node_modules/react-native"))
                |     }
        """.trimMargin(),
      )
    }

    return try {
      val packageJson = Gson().fromJson(packageJsonFile.readText(), JsonObject::class.java)
      val version = packageJson.get("version")?.asString
        ?: error("No 'version' field found in ${packageJsonFile.absolutePath}")

      version
    } catch (e: Exception) {
      error(
        """
                |Failed to read React Native version from package.json.
                |
                |File: ${packageJsonFile.absolutePath}
                |Error: ${e.message}
                |
                |Verify that the file is valid JSON and contains a 'version' field.
        """.trimMargin(),
      )
    }
  }

  /**
   * Reads React Native version from the project's node_modules.
   *
   * @param project The Gradle project
   * @return The version string
   */
  fun readVersion(project: Project): String {
    val reactNativeDir = project.rootProject.file("node_modules/react-native")
    return readVersion(reactNativeDir)
  }

  /**
   * Reads React Native version and Maven group ID.
   *
   * Reads gradle.properties first, falls back to package.json if not found.
   * Nightly builds automatically have the -SNAPSHOT suffix added.
   *
   * @param reactNativeDir React Native installation directory
   * @return Pair<version, groupId> (e.g., "0.81.6" to "com.facebook.react")
   * @throws IllegalStateException if version cannot be read
   */
  fun readVersionAndGroup(reactNativeDir: File): Pair<String, String> {
    val gradlePropertiesFile = reactNativeDir.resolve("ReactAndroid/gradle.properties")

    // Read gradle.properties first if it exists
    if (gradlePropertiesFile.exists()) {
      try {
        val properties = Properties().apply {
          gradlePropertiesFile.inputStream().use { load(it) }
        }

        val versionStringFromFile = (properties[INTERNAL_VERSION_NAME] as? String).orEmpty()

        // Add -SNAPSHOT suffix for nightly builds
        val versionString = if (versionStringFromFile.startsWith("0.0.0") ||
          "-nightly-" in versionStringFromFile
        ) {
          "$versionStringFromFile-SNAPSHOT"
        } else {
          versionStringFromFile
        }

        val groupString = properties[INTERNAL_PUBLISHING_GROUP] as? String
          ?: DEFAULT_INTERNAL_PUBLISHING_GROUP

        if (versionString.isEmpty()) {
          // Error if VERSION_NAME is empty and no package.json exists
          val packageJsonFile = reactNativeDir.resolve("package.json")
          if (!packageJsonFile.exists()) {
            error(
              """
                            |React Native gradle.properties does not contain VERSION_NAME.
                            |
                            |File: ${gradlePropertiesFile.absolutePath}
                            |
                            |This might indicate a corrupted React Native installation.
              """.trimMargin(),
            )
          }
          // Fallback to package.json if it exists
          val version = readVersion(reactNativeDir)
          return version to DEFAULT_INTERNAL_PUBLISHING_GROUP
        }

        return versionString to groupString
      } catch (e: IllegalStateException) {
        // Re-throw explicitly thrown errors
        throw e
      } catch (e: Exception) {
        // Fallback to package.json if gradle.properties read fails
        val version = readVersion(reactNativeDir)
        return version to DEFAULT_INTERNAL_PUBLISHING_GROUP
      }
    }

    // Use package.json if gradle.properties doesn't exist (legacy approach)
    val version = readVersion(reactNativeDir)
    return version to DEFAULT_INTERNAL_PUBLISHING_GROUP
  }

  /**
   * Reads complete coordinate information for React Native and Hermes.
   *
   * - ReactAndroid/gradle.properties: RN version, React/Hermes groups
   * - sdks/hermes-engine/version.properties: Hermes version, Hermes V1 version
   *
   * @param reactNativeDir React Native installation directory
   * @return DependencyCoordinates object
   * @throws IllegalStateException if version cannot be read
   */
  fun readCoordinates(reactNativeDir: File): DependencyCoordinates {
    val gradlePropertiesFile = reactNativeDir.resolve("ReactAndroid/gradle.properties")
    val hermesVersionFile = reactNativeDir.resolve("sdks/hermes-engine/version.properties")

    // Read React Native version and groups
    val (reactVersion, reactGroup, hermesGroup) = readReactProperties(gradlePropertiesFile, reactNativeDir)

    // Read Hermes versions
    val (hermesVersion, hermesV1Version) = readHermesProperties(hermesVersionFile, reactVersion)

    return DependencyCoordinates(
      reactVersion = reactVersion,
      hermesVersion = hermesVersion,
      hermesV1Version = hermesV1Version,
      reactGroup = reactGroup,
      hermesGroup = hermesGroup,
    )
  }

  private fun readReactProperties(gradlePropertiesFile: File, reactNativeDir: File): Triple<String, String, String> {
    if (!gradlePropertiesFile.exists()) {
      // Fallback to package.json if gradle.properties doesn't exist
      val version = readVersion(reactNativeDir)
      return Triple(version, DEFAULT_INTERNAL_PUBLISHING_GROUP, DEFAULT_HERMES_PUBLISHING_GROUP)
    }

    val properties = Properties().apply {
      gradlePropertiesFile.inputStream().use { load(it) }
    }

    val versionStringFromFile = (properties[INTERNAL_VERSION_NAME] as? String).orEmpty()
    val versionString = if (versionStringFromFile.startsWith("0.0.0") ||
      "-nightly-" in versionStringFromFile
    ) {
      "$versionStringFromFile-SNAPSHOT"
    } else {
      versionStringFromFile
    }

    if (versionString.isEmpty()) {
      error("React Native gradle.properties does not contain VERSION_NAME.")
    }

    val reactGroup = properties[INTERNAL_PUBLISHING_GROUP] as? String
      ?: DEFAULT_INTERNAL_PUBLISHING_GROUP
    val hermesGroup = properties[INTERNAL_HERMES_PUBLISHING_GROUP] as? String
      ?: DEFAULT_HERMES_PUBLISHING_GROUP

    return Triple(versionString, reactGroup, hermesGroup)
  }

  private fun readHermesProperties(hermesVersionFile: File, fallbackVersion: String): Pair<String, String> {
    if (!hermesVersionFile.exists()) {
      // Fallback to RN version if Hermes version file doesn't exist (RN 0.83 or lower compatibility)
      return fallbackVersion to fallbackVersion
    }

    val properties = Properties().apply {
      hermesVersionFile.inputStream().use { load(it) }
    }

    val hermesVersionFromFile = (properties[INTERNAL_HERMES_VERSION_NAME] as? String).orEmpty()
    val hermesVersion = if (hermesVersionFromFile.startsWith("0.0.0") ||
      "-commitly-" in hermesVersionFromFile
    ) {
      "$hermesVersionFromFile-SNAPSHOT"
    } else {
      hermesVersionFromFile
    }

    val hermesV1Version = (properties[INTERNAL_HERMES_V1_VERSION_NAME] as? String).orEmpty()

    // Fallback if both are empty
    return if (hermesVersion.isEmpty() && hermesV1Version.isEmpty()) {
      fallbackVersion to fallbackVersion
    } else {
      hermesVersion to hermesV1Version
    }
  }

  /**
   * Validates that the React Native version meets minimum requirements.
   *
   * @param version The React Native version string
   * @throws IllegalStateException if version is below minimum
   */
  fun validateVersion(version: String) {
    if (!isVersionCompatible(version, MINIMUM_RN_VERSION)) {
      error(
        """
                |React Native version $version is not supported.
                |
                |Current version: $version
                |Minimum required version: $MINIMUM_RN_VERSION
                |
                |Solution: Update React Native to version $MINIMUM_RN_VERSION or higher:
                |  npm install react-native@^$MINIMUM_RN_VERSION
                |  # or
                |  yarn add react-native@^$MINIMUM_RN_VERSION
        """.trimMargin(),
      )
    }
  }

  /**
   * Compares two semantic version strings.
   *
   * @param current The current version
   * @param minimum The minimum required version
   * @return true if current >= minimum, false otherwise
   */
  private fun isVersionCompatible(current: String, minimum: String): Boolean {
    // Parse semantic versions (major.minor.patch)
    val currentParts = parseVersion(current)
    val minimumParts = parseVersion(minimum)

    // Compare major.minor.patch
    for (i in 0 until 3) {
      val currentPart = currentParts.getOrNull(i) ?: 0
      val minimumPart = minimumParts.getOrNull(i) ?: 0

      when {
        currentPart > minimumPart -> return true
        currentPart < minimumPart -> return false
        // Equal, continue to next part
      }
    }

    return true // Versions are equal
  }

  /**
   * Parses a semantic version string into major, minor, patch components.
   *
   * Supports version formats:
   * - X.Y.Z (stable)
   * - X.Y.Z-rc.N (release candidate)
   * - X.Y.Z-SNAPSHOT (snapshot)
   * - X.Y.Z-nightly-YYYYMMDD (nightly)
   *
   * @param version The version string (e.g., "0.81.6" or "0.81.6-rc.0")
   * @return List of [major, minor, patch] as integers
   */
  private fun parseVersion(version: String): List<Int> {
    // Remove pre-release suffix (e.g., "-rc.0", "-SNAPSHOT", "-nightly-20240101")
    val versionCore = version.split("-")[0]

    return versionCore.split(".")
      .mapNotNull { it.toIntOrNull() }
  }

  /**
   * Gets the minimum supported React Native version.
   */
  fun getMinimumVersion(): String = MINIMUM_RN_VERSION
}
