package run.granite.gradle.utils

import org.gradle.api.JavaVersion
import org.gradle.api.Project

/**
 * Validates JDK version requirements for Granite plugin.
 *
 * The plugin requires JDK 17 or higher due to:
 * - Modern Gradle features requiring Java 17
 * - React Native Gradle plugin compatibility
 * - Android Gradle Plugin 8.x requirements
 */
object JdkValidator {

  private val MINIMUM_JDK_VERSION = JavaVersion.VERSION_17

  /**
   * Validates that the current JDK meets minimum version requirements.
   *
   * @param project The Gradle project
   * @throws IllegalStateException if JDK version is below minimum
   */
  fun validate(project: Project) {
    val currentJavaVersion = JavaVersion.current()

    if (currentJavaVersion < MINIMUM_JDK_VERSION) {
      error(
        """
                |Granite plugin requires JDK 17 or higher.
                |
                |Current JDK version: $currentJavaVersion
                |Required JDK version: $MINIMUM_JDK_VERSION or higher
                |
                |Solutions:
                |  1. Update your JDK installation to version 17 or higher
                |  2. Configure Gradle to use JDK 17+:
                |     - Set JAVA_HOME environment variable to JDK 17+ path
                |     - Or configure in gradle.properties:
                |       org.gradle.java.home=/path/to/jdk-17
                |  3. Use Gradle toolchain to automatically download JDK 17:
                |     Add to build.gradle.kts:
                |       java {
                |           toolchain {
                |               languageVersion.set(JavaLanguageVersion.of(17))
                |           }
                |       }
                |
                |Project: ${project.path}
        """.trimMargin(),
      )
    }

    project.logger.lifecycle("Granite plugin: JDK validation passed (using JDK $currentJavaVersion)")
  }

  /**
   * Gets the current JDK version.
   */
  fun getCurrentVersion(): JavaVersion = JavaVersion.current()

  /**
   * Gets the minimum required JDK version.
   */
  fun getMinimumVersion(): JavaVersion = MINIMUM_JDK_VERSION

  /**
   * Checks if the current JDK meets minimum requirements without throwing an error.
   *
   * @return true if current JDK >= minimum version, false otherwise
   */
  fun isCompatible(): Boolean = JavaVersion.current() >= MINIMUM_JDK_VERSION
}
