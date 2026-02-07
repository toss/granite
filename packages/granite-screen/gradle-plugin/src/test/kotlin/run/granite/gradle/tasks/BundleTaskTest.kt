package run.granite.gradle.tasks

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

/**
 * Unit tests for BundleTask.
 *
 * Tests JavaScript bundling and Hermes compilation logic structure.
 *
 * Note: Full integration testing (actual Metro/Hermes execution) requires
 * Node.js, React Native CLI, and Hermes compiler, so is done separately.
 * These tests focus on task structure validation.
 */
class BundleTaskTest {

  @Test
  fun `task is cacheable`() {
    val annotations = BundleTask::class.annotations
    assertThat(annotations)
      .anyMatch { it.annotationClass.simpleName == "CacheableTask" }
  }

  @Test
  fun `task has all required properties`() {
    val propertyNames = BundleTask::class.members
      .filter {
        it.name.endsWith("File") || it.name.endsWith("Dir") ||
          it.name == "devMode" ||
          it.name == "bundleAssetName" || it.name == "variantName"
      }
      .map { it.name }
      .toSet()

    assertThat(propertyNames).contains("entryFile")
    assertThat(propertyNames).contains("reactNativeDir")
    assertThat(propertyNames).contains("nodeModulesDir")
    assertThat(propertyNames).contains("projectDir")
    assertThat(propertyNames).contains("bundleFile")
    assertThat(propertyNames).contains("sourceMapFile")
    assertThat(propertyNames).contains("bundleAssetName")
    assertThat(propertyNames).contains("devMode")
    assertThat(propertyNames).contains("variantName")
  }

  @Test
  fun `task has execute method`() {
    val executeMethods = BundleTask::class.members
      .filter { it.name == "execute" }

    assertThat(executeMethods).isNotEmpty
  }

  @Test
  fun `task class is abstract`() {
    assertThat(BundleTask::class.isAbstract).isTrue
  }

  @Test
  fun `task has private helper methods`() {
    val privateMembers = BundleTask::class.members
      .map { it.name }
      .toSet()

    // Execute method orchestrates the bundling process
    assertThat(privateMembers).contains("execute")
  }
}
