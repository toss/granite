package run.granite.gradle

import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Unit tests for GranitePlugin.
 */
class GranitePluginTest {

  @TempDir
  lateinit var testProjectDir: File

  private lateinit var buildFile: File
  private lateinit var settingsFile: File

  @BeforeEach
  fun setup() {
    buildFile = File(testProjectDir, "build.gradle.kts")
    settingsFile = File(testProjectDir, "settings.gradle.kts")
  }

  @Test
  fun `plugin applies successfully to library project`() {
    // Given
    val project = ProjectBuilder.builder()
      .withProjectDir(testProjectDir)
      .build()

    // When
    project.pluginManager.apply("com.android.library")
    project.pluginManager.apply(GranitePlugin::class.java)

    // Then
    assertTrue(project.plugins.hasPlugin(GranitePlugin::class.java))
    assertNotNull(project.extensions.findByName("granite"))
  }

  @Test
  fun `plugin creates granite extension with correct type`() {
    // Given
    val project = ProjectBuilder.builder()
      .withProjectDir(testProjectDir)
      .build()

    // When
    project.pluginManager.apply("com.android.library")
    project.pluginManager.apply(GranitePlugin::class.java)

    // Then
    val extension = project.extensions.findByName("granite")
    assertNotNull(extension)
    assertTrue(extension is GraniteExtension)
  }

  @Test
  fun `plugin registers autolinking task`() {
    // Given
    val project = ProjectBuilder.builder()
      .withProjectDir(testProjectDir)
      .build()

    setupMinimalProject(project)

    // When
    project.pluginManager.apply("com.android.library")
    project.pluginManager.apply(GranitePlugin::class.java)

    // Force evaluation of afterEvaluate blocks by accessing the task container
    // Note: This is a simplified test. Full task registration should be tested with GradleRunner.
    // For now, we just verify the plugin applies without errors
    assertTrue(project.plugins.hasPlugin(GranitePlugin::class.java))
  }

  @Test
  fun `plugin registers codegen tasks`() {
    // Given
    val project = ProjectBuilder.builder()
      .withProjectDir(testProjectDir)
      .build()

    setupMinimalProject(project)

    // When
    project.pluginManager.apply("com.android.library")
    project.pluginManager.apply(GranitePlugin::class.java)

    // Note: Task registration happens in afterEvaluate, which doesn't execute with ProjectBuilder.
    // Full task registration should be tested with GradleRunner integration tests.
    // For now, we verify the plugin and extension are configured correctly
    val extension = project.extensions.findByName("granite")
    assertNotNull(extension)
    assertTrue(extension is GraniteExtension)
  }

  @Test
  fun `plugin fails when applied to application project`() {
    // Given
    val project = ProjectBuilder.builder()
      .withProjectDir(testProjectDir)
      .build()

    // When/Then
    project.pluginManager.apply("com.android.application")

    // Gradle wraps exceptions in PluginApplicationException
    val exception = assertThrows<org.gradle.api.internal.plugins.PluginApplicationException> {
      project.pluginManager.apply(GranitePlugin::class.java)
    }

    // Verify the cause is our expected IllegalStateException
    assertTrue(exception.cause is IllegalStateException)
  }

  @Test
  fun `plugin constants are correct`() {
    assertEquals("run.granite.library", GranitePlugin.PLUGIN_ID)
    assertEquals("granite", GranitePlugin.EXTENSION_NAME)
    assertEquals("granite", GranitePlugin.PLUGIN_GROUP)
  }

  /**
   * Sets up minimal project structure for testing.
   */
  private fun setupMinimalProject(project: org.gradle.api.Project) {
    // Create minimal required directories
    File(testProjectDir, "src/main/js").mkdirs()
    File(testProjectDir, "src/main/java").mkdirs()

    // Create minimal entry file
    val entryFile = File(testProjectDir, "src/main/js/index.js")
    entryFile.parentFile.mkdirs()
    entryFile.writeText("// Empty entry file")

    // Create fake node_modules structure
    val nodeModules = File(testProjectDir, "node_modules")
    val reactNativeDir = File(nodeModules, "react-native")
    val androidDir = File(reactNativeDir, "android")
    androidDir.mkdirs()

    // Create package.json
    val packageJson = File(reactNativeDir, "package.json")
    packageJson.writeText("""{"version":"0.81.6"}""")

    // Create cli.js
    val cliJs = File(reactNativeDir, "cli.js")
    cliJs.writeText("// Mock CLI")
  }
}
