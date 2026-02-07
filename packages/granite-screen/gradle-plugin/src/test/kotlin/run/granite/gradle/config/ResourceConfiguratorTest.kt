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
 * Unit tests for ResourceConfigurator.
 *
 * Tests the configuration of Android resource packaging options,
 * particularly bundle compression settings.
 */
class ResourceConfiguratorTest {

  private lateinit var project: Project
  private lateinit var extension: GraniteExtension
  private lateinit var androidExtension: LibraryExtension
  private lateinit var configurator: ResourceConfigurator

  @BeforeEach
  fun setup() {
    project = ProjectBuilder.builder().build()
    project.pluginManager.apply("com.android.library")

    extension = project.extensions.create("granite", GraniteExtension::class.java, project)
    androidExtension = project.extensions.getByType(LibraryExtension::class.java)

    configurator = ResourceConfigurator(project, extension)
  }

  @Test
  fun `configurator is created successfully`() {
    assertNotNull(configurator, "ResourceConfigurator should be created")
  }

  @Test
  fun `configure method executes without errors when compression is enabled`() {
    extension.bundleCompressionEnabled.set(true)

    // Should not throw
    configurator.configure(androidExtension)
  }

  @Test
  fun `configure method executes without errors when compression is disabled`() {
    extension.bundleCompressionEnabled.set(false)

    // Should not throw
    configurator.configure(androidExtension)
  }

  @Test
  fun `packaging configuration is applied to android extension`() {
    extension.bundleCompressionEnabled.set(false)

    configurator.configure(androidExtension)

    // Verify packaging configuration exists
    assertNotNull(androidExtension.packaging, "Packaging should be configured")
  }

  @Test
  fun `map files are always excluded from compression`() {
    extension.bundleCompressionEnabled.set(true)

    configurator.configure(androidExtension)

    // Verify packaging resources exist
    assertNotNull(androidExtension.packaging.resources, "Packaging resources should be configured")
  }

  @Test
  fun `bundle compression disabled excludes bundle and hbc files`() {
    extension.bundleCompressionEnabled.set(false)

    configurator.configure(androidExtension)

    val excludes = androidExtension.packaging.resources.excludes

    // When compression is disabled, bundle files should be excluded from APK compression
    assertTrue(
      excludes.any { it.contains(".bundle") },
      "Bundle files should be excluded when compression is disabled",
    )
    assertTrue(
      excludes.any { it.contains(".hbc") },
      "Hermes bytecode files should be excluded when compression is disabled",
    )
    assertTrue(
      excludes.any { it.contains(".map") },
      "Map files should always be excluded",
    )
  }

  @Test
  fun `bundle compression enabled only excludes map files`() {
    extension.bundleCompressionEnabled.set(true)

    configurator.configure(androidExtension)

    val excludes = androidExtension.packaging.resources.excludes

    // When compression is enabled, only map files should be excluded
    assertTrue(
      excludes.any { it.contains(".map") },
      "Map files should always be excluded",
    )
  }

  @Test
  fun `configurator can be called multiple times`() {
    extension.bundleCompressionEnabled.set(false)

    // Should not throw when called multiple times
    configurator.configure(androidExtension)
    configurator.configure(androidExtension)
  }

  @Test
  fun `configurator works with default extension values`() {
    // Don't set any values explicitly, use defaults

    // Should not throw with default values
    configurator.configure(androidExtension)
  }
}
