package run.granite.gradle

import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Unit tests for GraniteExtension.
 */
class GraniteExtensionTest {

  @TempDir
  lateinit var testProjectDir: File

  private lateinit var project: org.gradle.api.Project
  private lateinit var extension: GraniteExtension

  @BeforeEach
  fun setup() {
    project = ProjectBuilder.builder()
      .withProjectDir(testProjectDir)
      .build()

    // Apply plugins to create extension
    project.pluginManager.apply("com.android.library")
    project.pluginManager.apply(GranitePlugin::class.java)

    extension = project.extensions.getByType(GraniteExtension::class.java)
  }

  @Test
  fun `extension has correct default values`() {
    // Then
    assertEquals("src/main/js/index.js", extension.entryFile.get())
    assertEquals("index.android.bundle", extension.bundleAssetName.get())
    assertTrue(extension.bundleCompressionEnabled.get())
    assertEquals(4, extension.nativeArchitectures.get().size)
    assertTrue(extension.nativeArchitectures.get().contains("arm64-v8a"))
    assertTrue(extension.nativeArchitectures.get().contains("armeabi-v7a"))
  }

  @Test
  fun `extension allows customization of properties`() {
    // When
    extension.entryFile.set("custom/entry.js")
    extension.bundleAssetName.set("custom.bundle")
    extension.bundleCompressionEnabled.set(false)
    extension.nativeArchitectures.set(listOf("arm64-v8a"))

    // Then
    assertEquals("custom/entry.js", extension.entryFile.get())
    assertEquals("custom.bundle", extension.bundleAssetName.get())
    assertEquals(false, extension.bundleCompressionEnabled.get())
    assertEquals(1, extension.nativeArchitectures.get().size)
  }

  // Test removed: entryFile validation moved to BundleTask execution time

  @Test
  fun `validate succeeds when all required files exist`() {
    // Given
    setupValidProject()

    // When/Then - Should not throw
    extension.validate()
  }

  @Test
  fun `validate succeeds even without entry file`() {
    // Given - Only React Native directory setup, no entry file
    val nodeModules = File(testProjectDir, "node_modules")
    val reactNativeDir = File(nodeModules, "react-native")
    reactNativeDir.mkdirs()

    val packageJson = File(reactNativeDir, "package.json")
    packageJson.writeText("""{"version":"0.81.6"}""")

    extension.reactNativeDir.set(reactNativeDir)
    extension.nodeModulesDir.set(nodeModules)

    // When/Then - Should not throw (entryFile validation deferred to BundleTask)
    extension.validate()
  }

  @Test
  fun `validate fails when React Native directory does not exist`() {
    // Given - React Native dir not created

    // When/Then
    assertThrows<IllegalStateException> {
      extension.validate()
    }
  }

  // Test removed: Hermes is now always enabled, cannot be disabled

  @Test
  fun `validate fails with invalid ABI`() {
    // Given
    setupValidProject()
    extension.nativeArchitectures.set(listOf("invalid-abi"))

    // When/Then
    val exception = assertThrows<IllegalStateException> {
      extension.validate()
    }

    assertTrue(exception.message?.contains("Invalid") == true)
    assertTrue(exception.message?.contains("ABI") == true)
  }

  @Test
  fun `validate accepts all valid ABIs`() {
    // Given
    setupValidProject()
    val validAbis = listOf("armeabi-v7a", "arm64-v8a", "x86", "x86_64")
    extension.nativeArchitectures.set(validAbis)

    // When/Then - Should not throw
    extension.validate()
  }

  @Test
  fun `getEntryFileResolved returns correct file`() {
    // Given
    extension.entryFile.set("custom/entry.js")

    // When
    val resolved = extension.getEntryFileResolved()

    // Then - Use canonical paths to handle symlinks (e.g., /var vs /private/var on macOS)
    assertEquals(
      File(testProjectDir, "custom/entry.js").canonicalPath,
      resolved.canonicalPath,
    )
  }

  @Test
  fun `getReactNativeDirResolved returns correct directory`() {
    // Given
    val customRnDir = File(testProjectDir, "custom/react-native")
    extension.reactNativeDir.set(customRnDir)

    // When
    val resolved = extension.getReactNativeDirResolved()

    // Then - Use canonical paths to handle symlinks
    assertEquals(customRnDir.canonicalPath, resolved.canonicalPath)
  }

  @Test
  fun `getNodeModulesDirResolved returns correct directory`() {
    // Given
    val customNodeModules = File(testProjectDir, "custom/node_modules")
    extension.nodeModulesDir.set(customNodeModules)

    // When
    val resolved = extension.getNodeModulesDirResolved()

    // Then - Use canonical paths to handle symlinks
    assertEquals(customNodeModules.canonicalPath, resolved.canonicalPath)
  }

  /**
   * Sets up a valid project structure for testing.
   */
  private fun setupValidProject() {
    // Create entry file
    val entryFile = File(testProjectDir, "src/main/js/index.js")
    entryFile.parentFile.mkdirs()
    entryFile.writeText("// Entry file")

    // Create React Native directory structure
    val nodeModules = File(testProjectDir, "node_modules")
    val reactNativeDir = File(nodeModules, "react-native")
    reactNativeDir.mkdirs()

    // Create package.json
    val packageJson = File(reactNativeDir, "package.json")
    packageJson.writeText("""{"version":"0.81.6"}""")

    // Update extension to point to test directories
    extension.reactNativeDir.set(reactNativeDir)
    extension.nodeModulesDir.set(nodeModules)
  }
}
