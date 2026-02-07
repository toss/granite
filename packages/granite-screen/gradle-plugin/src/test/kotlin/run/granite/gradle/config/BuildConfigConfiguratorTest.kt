package run.granite.gradle.config

import com.android.build.gradle.LibraryExtension
import org.gradle.api.Project
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import run.granite.gradle.GraniteExtension
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Unit tests for BuildConfigConfigurator.
 *
 * Tests the configuration of Android BuildConfig field generation for
 * feature flags and React Native configuration.
 */
class BuildConfigConfiguratorTest {

  private lateinit var project: Project
  private lateinit var extension: GraniteExtension
  private lateinit var androidExtension: LibraryExtension
  private lateinit var configurator: BuildConfigConfigurator

  @BeforeEach
  fun setup() {
    project = ProjectBuilder.builder().build()
    project.pluginManager.apply("com.android.library")

    extension = project.extensions.create("granite", GraniteExtension::class.java, project)
    androidExtension = project.extensions.getByType(LibraryExtension::class.java)

    configurator = BuildConfigConfigurator(project, extension)
  }

  @Test
  fun `configurator is created successfully`() {
    assertNotNull(configurator, "BuildConfigConfigurator should be created")
  }

  @Test
  fun `configure method executes without errors`() {
    // Hermes is always enabled
    extension.reactNativeVersion.set("0.81.0")
    extension.bundleAssetName.set("index.android")

    // Should not throw
    configurator.configure(androidExtension)
  }

  @Test
  fun `buildConfig feature is enabled`() {
    // Hermes is always enabled
    extension.reactNativeVersion.set("0.81.0")
    extension.bundleAssetName.set("index.android")

    configurator.configure(androidExtension)

    // Verify BuildConfig is enabled
    assertTrue(
      androidExtension.buildFeatures.buildConfig == true,
      "BuildConfig feature should be enabled",
    )
  }

  @Test
  fun `configure works with default extension values`() {
    // Should not throw with default values
    configurator.configure(androidExtension)

    assertTrue(
      androidExtension.buildFeatures.buildConfig == true,
      "BuildConfig feature should be enabled even with defaults",
    )
  }

  // Test removed: Hermes is now always enabled, cannot be disabled

  @Test
  fun `configure works with new architecture enabled`() {
    // Both Hermes and New Architecture are always enabled
    extension.reactNativeVersion.set("0.81.0")
    extension.bundleAssetName.set("index.android")

    // Should not throw
    configurator.configure(androidExtension)
  }

  @Test
  fun `configure can be called multiple times`() {
    // Hermes is always enabled
    extension.reactNativeVersion.set("0.81.0")
    extension.bundleAssetName.set("index.android")

    // Should not throw when called multiple times
    configurator.configure(androidExtension)
    configurator.configure(androidExtension)
  }

  @Test
  fun `configure with different react native versions`() {
    extension.reactNativeVersion.set("0.82.0")

    // Should not throw
    configurator.configure(androidExtension)
  }

  @Test
  fun `configure with custom bundle asset name`() {
    extension.bundleAssetName.set("custom.bundle")

    // Should not throw
    configurator.configure(androidExtension)
  }
}
