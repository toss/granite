package run.granite.gradle

import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Unit tests for GraniteRootProjectPlugin.
 */
class GraniteRootProjectPluginTest {

  @Test
  fun `plugin constants are correct`() {
    assertEquals("run.granite.rootproject", GraniteRootProjectPlugin.PLUGIN_ID)
    assertEquals("graniteRoot", GraniteRootProjectPlugin.EXTENSION_NAME)
  }

  @Test
  fun `plugin applies successfully to root project`() {
    // Given
    val project = ProjectBuilder.builder().build()

    // When
    project.pluginManager.apply(GraniteRootProjectPlugin::class.java)

    // Then
    assertTrue(project.plugins.hasPlugin(GraniteRootProjectPlugin::class.java))
  }

  @Test
  fun `plugin creates graniteRoot extension`() {
    // Given
    val project = ProjectBuilder.builder().build()

    // When
    project.pluginManager.apply(GraniteRootProjectPlugin::class.java)

    // Then
    val extension = project.extensions.findByName("graniteRoot")
    assertNotNull(extension)
    assertTrue(extension is GraniteRootExtension)
  }

  @Test
  fun `extension has correct default values`() {
    // Given
    val project = ProjectBuilder.builder().build()
    project.pluginManager.apply(GraniteRootProjectPlugin::class.java)

    // When
    val extension = project.extensions.getByType(GraniteRootExtension::class.java)

    // Then
    assertEquals("com.facebook.react", extension.reactGroup.get())
    assertEquals("com.facebook.hermes", extension.hermesGroup.get())
    assertEquals(project.file("node_modules"), extension.nodeModulesDir.get())
    // reactNativeVersion and hermesVersion should not have conventions (are not present)
    assertTrue(!extension.reactNativeVersion.isPresent)
    assertTrue(!extension.hermesVersion.isPresent)
  }

  @Test
  fun `plugin fails when applied to non-root project`() {
    // Given
    val rootProject = ProjectBuilder.builder()
      .withName("root")
      .build()
    val subProject = ProjectBuilder.builder()
      .withName("sub")
      .withParent(rootProject)
      .build()

    // When/Then
    // Gradle wraps exceptions in PluginApplicationException
    val exception = assertThrows<org.gradle.api.internal.plugins.PluginApplicationException> {
      subProject.pluginManager.apply(GraniteRootProjectPlugin::class.java)
    }

    // Verify the cause is our expected IllegalStateException
    assertTrue(exception.cause is IllegalStateException)
    assertTrue(exception.cause!!.message!!.contains("can only be applied to the root project"))
    assertTrue(exception.cause!!.message!!.contains("Current project: :sub"))
  }
}
