package run.granite.gradle.utils

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import run.granite.gradle.config.DependencyCoordinates

/**
 * Unit tests for ReactNativeVersionReader.
 */
class ReactNativeVersionReaderTest {

    @TempDir
    lateinit var tempDir: File

    @Test
    fun `readVersion reads version from package json`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"version":"0.81.6"}""")

        // When
        val version = ReactNativeVersionReader.readVersion(reactNativeDir)

        // Then
        assertEquals("0.81.6", version)
    }

    @Test
    fun `readVersion handles version with pre-release suffix`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"version":"0.82.0-rc.0"}""")

        // When
        val version = ReactNativeVersionReader.readVersion(reactNativeDir)

        // Then
        assertEquals("0.82.0-rc.0", version)
    }

    @Test
    fun `readVersion throws error when package json not found`() {
        // Given
        val reactNativeDir = File(tempDir, "nonexistent")

        // When/Then
        val exception = assertThrows<IllegalStateException> {
            ReactNativeVersionReader.readVersion(reactNativeDir)
        }

        assertTrue(exception.message?.contains("package.json not found") == true)
    }

    @Test
    fun `readVersion throws error when version field missing`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"name":"react-native"}""")

        // When/Then
        val exception = assertThrows<IllegalStateException> {
            ReactNativeVersionReader.readVersion(reactNativeDir)
        }

        assertTrue(exception.message?.contains("version") == true)
    }

    @Test
    fun `validateVersion succeeds for supported versions`() {
        // Given
        val supportedVersions = listOf("0.81.0", "0.81.6", "0.82.0", "1.0.0")

        // When/Then - Should not throw
        for (version in supportedVersions) {
            ReactNativeVersionReader.validateVersion(version)
        }
    }

    @Test
    fun `validateVersion fails for unsupported versions`() {
        // Given
        val unsupportedVersions = listOf("0.80.9", "0.70.0", "0.60.0")

        // When/Then
        for (version in unsupportedVersions) {
            val exception = assertThrows<IllegalStateException> {
                ReactNativeVersionReader.validateVersion(version)
            }

            assertTrue(exception.message?.contains("not supported") == true)
            assertTrue(exception.message?.contains("0.81.0") == true)
        }
    }

    @Test
    fun `getMinimumVersion returns correct minimum`() {
        // When
        val minVersion = ReactNativeVersionReader.getMinimumVersion()

        // Then
        assertEquals("0.81.0", minVersion)
    }

    @Test
    fun `version comparison handles major version correctly`() {
        // Test that 1.0.0 > 0.81.0
        ReactNativeVersionReader.validateVersion("1.0.0")
    }

    @Test
    fun `version comparison handles minor version correctly`() {
        // Test that 0.82.0 > 0.81.0
        ReactNativeVersionReader.validateVersion("0.82.0")
    }

    @Test
    fun `version comparison handles patch version correctly`() {
        // Test that 0.81.1 > 0.81.0
        ReactNativeVersionReader.validateVersion("0.81.1")
    }

    @Test
    fun `version comparison handles exact minimum version`() {
        // Test that 0.81.0 == 0.81.0
        ReactNativeVersionReader.validateVersion("0.81.0")
    }

    @Test
    fun `readVersion handles malformed JSON gracefully`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""not valid json""")

        // When/Then
        assertThrows<IllegalStateException> {
            ReactNativeVersionReader.readVersion(reactNativeDir)
        }
    }

    @Test
    fun `readVersionAndGroup reads from gradle properties`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val reactAndroidDir = File(reactNativeDir, "ReactAndroid")
        reactAndroidDir.mkdirs()

        val gradleProperties = File(reactAndroidDir, "gradle.properties")
        gradleProperties.writeText("""
            VERSION_NAME=0.81.1
            react.internal.publishingGroup=com.facebook.react
        """.trimIndent())

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"version":"0.81.1"}""")

        // When
        val (version, group) = ReactNativeVersionReader.readVersionAndGroup(reactNativeDir)

        // Then
        assertEquals("0.81.1", version)
        assertEquals("com.facebook.react", group)
    }

    @Test
    fun `readVersionAndGroup returns default group when publishingGroup is missing`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val reactAndroidDir = File(reactNativeDir, "ReactAndroid")
        reactAndroidDir.mkdirs()

        val gradleProperties = File(reactAndroidDir, "gradle.properties")
        gradleProperties.writeText("""
            VERSION_NAME=0.81.1
        """.trimIndent())

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"version":"0.81.1"}""")

        // When
        val (version, group) = ReactNativeVersionReader.readVersionAndGroup(reactNativeDir)

        // Then
        assertEquals("0.81.1", version)
        assertEquals("com.facebook.react", group)
    }

    @Test
    fun `readVersionAndGroup handles custom publishingGroup`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val reactAndroidDir = File(reactNativeDir, "ReactAndroid")
        reactAndroidDir.mkdirs()

        val gradleProperties = File(reactAndroidDir, "gradle.properties")
        gradleProperties.writeText("""
            VERSION_NAME=0.81.1-nightly-20250123
            react.internal.publishingGroup=com.custom.react
        """.trimIndent())

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"version":"0.81.1-nightly-20250123"}""")

        // When
        val (version, group) = ReactNativeVersionReader.readVersionAndGroup(reactNativeDir)

        // Then
        assertEquals("0.81.1-nightly-20250123-SNAPSHOT", version)
        assertEquals("com.custom.react", group)
    }

    @Test
    fun `readVersionAndGroup adds SNAPSHOT suffix for nightly versions starting with 0_0_0`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val reactAndroidDir = File(reactNativeDir, "ReactAndroid")
        reactAndroidDir.mkdirs()

        val gradleProperties = File(reactAndroidDir, "gradle.properties")
        gradleProperties.writeText("""
            VERSION_NAME=0.0.0-20250123-1234-abc123
            react.internal.publishingGroup=com.facebook.react
        """.trimIndent())

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"version":"0.0.0-20250123-1234-abc123"}""")

        // When
        val (version, _) = ReactNativeVersionReader.readVersionAndGroup(reactNativeDir)

        // Then
        assertEquals("0.0.0-20250123-1234-abc123-SNAPSHOT", version)
    }

    @Test
    fun `readVersionAndGroup adds SNAPSHOT suffix for nightly versions containing nightly`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val reactAndroidDir = File(reactNativeDir, "ReactAndroid")
        reactAndroidDir.mkdirs()

        val gradleProperties = File(reactAndroidDir, "gradle.properties")
        gradleProperties.writeText("""
            VERSION_NAME=0.81.0-nightly-20250123-abc123
            react.internal.publishingGroup=com.facebook.react
        """.trimIndent())

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"version":"0.81.0-nightly-20250123-abc123"}""")

        // When
        val (version, _) = ReactNativeVersionReader.readVersionAndGroup(reactNativeDir)

        // Then
        assertEquals("0.81.0-nightly-20250123-abc123-SNAPSHOT", version)
    }

    @Test
    fun `readVersionAndGroup does NOT add SNAPSHOT for stable releases`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val reactAndroidDir = File(reactNativeDir, "ReactAndroid")
        reactAndroidDir.mkdirs()

        val gradleProperties = File(reactAndroidDir, "gradle.properties")
        gradleProperties.writeText("""
            VERSION_NAME=0.81.6
            react.internal.publishingGroup=com.facebook.react
        """.trimIndent())

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"version":"0.81.6"}""")

        // When
        val (version, _) = ReactNativeVersionReader.readVersionAndGroup(reactNativeDir)

        // Then
        assertEquals("0.81.6", version)
    }

    @Test
    fun `readVersionAndGroup does NOT add SNAPSHOT for rc versions`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val reactAndroidDir = File(reactNativeDir, "ReactAndroid")
        reactAndroidDir.mkdirs()

        val gradleProperties = File(reactAndroidDir, "gradle.properties")
        gradleProperties.writeText("""
            VERSION_NAME=0.82.0-rc.0
            react.internal.publishingGroup=com.facebook.react
        """.trimIndent())

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"version":"0.82.0-rc.0"}""")

        // When
        val (version, _) = ReactNativeVersionReader.readVersionAndGroup(reactNativeDir)

        // Then
        assertEquals("0.82.0-rc.0", version)
    }

    @Test
    fun `readVersionAndGroup falls back to package json when gradle properties missing`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()
        // No ReactAndroid/gradle.properties - fallback to package.json

        val packageJson = File(reactNativeDir, "package.json")
        packageJson.writeText("""{"version":"0.81.6"}""")

        // When
        val (version, group) = ReactNativeVersionReader.readVersionAndGroup(reactNativeDir)

        // Then
        assertEquals("0.81.6", version)
        assertEquals("com.facebook.react", group)
    }

    @Test
    fun `readVersionAndGroup throws error when VERSION_NAME empty and no package json`() {
        // Given
        val reactNativeDir = File(tempDir, "react-native")
        reactNativeDir.mkdirs()

        val reactAndroidDir = File(reactNativeDir, "ReactAndroid")
        reactAndroidDir.mkdirs()

        val gradleProperties = File(reactAndroidDir, "gradle.properties")
        gradleProperties.writeText("""
            react.internal.publishingGroup=com.custom.react
        """.trimIndent())
        // No VERSION_NAME - error expected

        // When/Then
        val exception = assertThrows<IllegalStateException> {
            ReactNativeVersionReader.readVersionAndGroup(reactNativeDir)
        }

        assertTrue(exception.message?.contains("VERSION_NAME") == true)
    }

    // === readCoordinates tests ===

    @Test
    fun `readCoordinates reads all version info from both files`() {
        // Given
        val reactNativeDir = setupReactNativeDirForCoordinates(
            gradleProperties = """
                VERSION_NAME=0.84.0-rc.4
                react.internal.publishingGroup=com.facebook.react
                react.internal.hermesPublishingGroup=com.facebook.hermes
            """.trimIndent(),
            hermesVersionProperties = """
                HERMES_VERSION_NAME=0.15.0
                HERMES_V1_VERSION_NAME=250829098.0.6
            """.trimIndent()
        )

        // When
        val coordinates = ReactNativeVersionReader.readCoordinates(reactNativeDir)

        // Then
        assertEquals("0.84.0-rc.4", coordinates.reactVersion)
        assertEquals("0.15.0", coordinates.hermesVersion)
        assertEquals("250829098.0.6", coordinates.hermesV1Version)
        assertEquals("com.facebook.react", coordinates.reactGroup)
        assertEquals("com.facebook.hermes", coordinates.hermesGroup)
    }

    @Test
    fun `readCoordinates uses default hermes group when not specified`() {
        // Given
        val reactNativeDir = setupReactNativeDirForCoordinates(
            gradleProperties = """
                VERSION_NAME=0.84.0
                react.internal.publishingGroup=com.facebook.react
            """.trimIndent(),
            hermesVersionProperties = """
                HERMES_VERSION_NAME=0.15.0
                HERMES_V1_VERSION_NAME=250829098.0.6
            """.trimIndent()
        )

        // When
        val coordinates = ReactNativeVersionReader.readCoordinates(reactNativeDir)

        // Then
        assertEquals("com.facebook.hermes", coordinates.hermesGroup)
    }

    @Test
    fun `readCoordinates falls back to RN version when hermes version file missing`() {
        // Given - RN 0.83 or lower scenario
        val reactNativeDir = setupReactNativeDirForCoordinates(
            gradleProperties = """
                VERSION_NAME=0.83.0
                react.internal.publishingGroup=com.facebook.react
            """.trimIndent(),
            hermesVersionProperties = null // File doesn't exist
        )

        // When
        val coordinates = ReactNativeVersionReader.readCoordinates(reactNativeDir)

        // Then
        assertEquals("0.83.0", coordinates.reactVersion)
        assertEquals("0.83.0", coordinates.hermesVersion)
        assertEquals("0.83.0", coordinates.hermesV1Version)
    }

    @Test
    fun `readCoordinates handles nightly hermes version with SNAPSHOT suffix`() {
        // Given
        val reactNativeDir = setupReactNativeDirForCoordinates(
            gradleProperties = """
                VERSION_NAME=0.84.0
            """.trimIndent(),
            hermesVersionProperties = """
                HERMES_VERSION_NAME=0.0.0-commitly-20250123-abc123
                HERMES_V1_VERSION_NAME=250829098.0.0
            """.trimIndent()
        )

        // When
        val coordinates = ReactNativeVersionReader.readCoordinates(reactNativeDir)

        // Then
        assertEquals("0.0.0-commitly-20250123-abc123-SNAPSHOT", coordinates.hermesVersion)
    }

    @Test
    fun `readCoordinates returns V1 version from getEffectiveHermesVersion`() {
        // Given
        val reactNativeDir = setupReactNativeDirForCoordinates(
            gradleProperties = """
                VERSION_NAME=0.84.0
            """.trimIndent(),
            hermesVersionProperties = """
                HERMES_VERSION_NAME=0.15.0
                HERMES_V1_VERSION_NAME=250829098.0.6
            """.trimIndent()
        )

        // When
        val coordinates = ReactNativeVersionReader.readCoordinates(reactNativeDir)

        // Then
        assertEquals("250829098.0.6", coordinates.getEffectiveHermesVersion())
    }

    @Test
    fun `readCoordinates returns classic version when V1 empty`() {
        // Given
        val reactNativeDir = setupReactNativeDirForCoordinates(
            gradleProperties = """
                VERSION_NAME=0.84.0
            """.trimIndent(),
            hermesVersionProperties = """
                HERMES_VERSION_NAME=0.15.0
                HERMES_V1_VERSION_NAME=
            """.trimIndent()
        )

        // When
        val coordinates = ReactNativeVersionReader.readCoordinates(reactNativeDir)

        // Then
        assertEquals("0.15.0", coordinates.getEffectiveHermesVersion())
    }

    @Test
    fun `readCoordinates handles empty hermes version file gracefully`() {
        // Given - Hermes version file exists but is empty
        val reactNativeDir = setupReactNativeDirForCoordinates(
            gradleProperties = """
                VERSION_NAME=0.84.0
            """.trimIndent(),
            hermesVersionProperties = "" // Empty file
        )

        // When
        val coordinates = ReactNativeVersionReader.readCoordinates(reactNativeDir)

        // Then - Fallback to RN version
        assertEquals("0.84.0", coordinates.hermesVersion)
        assertEquals("0.84.0", coordinates.hermesV1Version)
    }

    @Test
    fun `readCoordinates handles malformed hermes version file gracefully`() {
        // Given - Hermes version file has invalid format
        val reactNativeDir = setupReactNativeDirForCoordinates(
            gradleProperties = """
                VERSION_NAME=0.84.0
            """.trimIndent(),
            hermesVersionProperties = """
                INVALID_KEY=some_value
                ANOTHER_INVALID=123
            """.trimIndent()
        )

        // When
        val coordinates = ReactNativeVersionReader.readCoordinates(reactNativeDir)

        // Then - Fallback to RN version
        assertEquals("0.84.0", coordinates.hermesVersion)
        assertEquals("0.84.0", coordinates.hermesV1Version)
    }

    // === Helper for readCoordinates tests ===

    private fun setupReactNativeDirForCoordinates(
        gradleProperties: String,
        hermesVersionProperties: String?,
        packageJsonVersion: String = "0.84.0"
    ): File {
        val reactNativeDir = File(tempDir, "rn-coords-${System.nanoTime()}")
        reactNativeDir.mkdirs()

        // package.json (for fallback)
        File(reactNativeDir, "package.json").writeText("""{"version":"$packageJsonVersion"}""")

        // ReactAndroid/gradle.properties
        val reactAndroidDir = File(reactNativeDir, "ReactAndroid")
        reactAndroidDir.mkdirs()
        File(reactAndroidDir, "gradle.properties").writeText(gradleProperties)

        // sdks/hermes-engine/version.properties
        if (hermesVersionProperties != null) {
            val hermesDir = File(reactNativeDir, "sdks/hermes-engine")
            hermesDir.mkdirs()
            File(hermesDir, "version.properties").writeText(hermesVersionProperties)
        }

        return reactNativeDir
    }
}
