package run.granite.gradle.config

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertNotNull
import kotlin.test.assertFalse

/**
 * Unit tests for DependencyConfigurator.
 *
 * Tests the dependency substitution logic that replaces deprecated React Native artifacts
 * with new ones and enforces version consistency across the project.
 *
 * Note: Custom Maven group tests are excluded (no real use case, official RN always uses com.facebook.react)
 */
class DependencyConfiguratorTest {

    @TempDir
    lateinit var tempDir: File

    @Test
    fun `getDependencySubstitutions returns base substitutions for default group`() {
        // Given
        val version = "0.81.1"
        val group = "com.facebook.react"

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(version, group)

        // Then
        // When using default group, only react-native and hermes-engine substitutions are needed
        assertEquals(2, substitutions.size)

        // react-native -> react-android substitution
        val reactSubstitution = substitutions.find { it.first == "com.facebook.react:react-native" }
        assertEquals("com.facebook.react:react-android:0.81.1", reactSubstitution?.second)
        assertTrue(reactSubstitution?.third?.contains("deprecated") == true)

        // hermes-engine -> hermes-android substitution
        val hermesSubstitution = substitutions.find { it.first == "com.facebook.react:hermes-engine" }
        assertEquals("com.facebook.react:hermes-android:0.81.1", hermesSubstitution?.second)
        assertTrue(hermesSubstitution?.third?.contains("deprecated") == true)
    }

    @Test
    fun `getDependencySubstitutions handles SNAPSHOT versions`() {
        // Given
        val version = "0.0.0-20250123-1234-abc123-SNAPSHOT"
        val group = "com.facebook.react"

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(version, group)

        // Then
        assertEquals(2, substitutions.size)

        val reactSubstitution = substitutions.find { it.first == "com.facebook.react:react-native" }
        assertEquals("com.facebook.react:react-android:0.0.0-20250123-1234-abc123-SNAPSHOT", reactSubstitution?.second)

        val hermesSubstitution = substitutions.find { it.first == "com.facebook.react:hermes-engine" }
        assertEquals("com.facebook.react:hermes-android:0.0.0-20250123-1234-abc123-SNAPSHOT", hermesSubstitution?.second)
    }

    @Test
    fun `getDependencySubstitutions includes reason for each substitution`() {
        // Given
        val version = "0.81.1"
        val group = "com.facebook.react"

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(version, group)

        // Then
        // All substitution rules should include a reason (third = reason)
        assertTrue(substitutions.all { it.third.isNotBlank() })
    }

    @Test
    fun `getDependencySubstitutions handles stable release versions`() {
        // Given
        val version = "0.81.6"
        val group = "com.facebook.react"

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(version, group)

        // Then
        assertEquals(2, substitutions.size)

        val reactSubstitution = substitutions.find { it.first == "com.facebook.react:react-native" }
        assertEquals("com.facebook.react:react-android:0.81.6", reactSubstitution?.second)
    }

    @Test
    fun `getDependencySubstitutions handles rc versions`() {
        // Given
        val version = "0.82.0-rc.0"
        val group = "com.facebook.react"

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(version, group)

        // Then
        assertEquals(2, substitutions.size)

        val reactSubstitution = substitutions.find { it.first == "com.facebook.react:react-native" }
        assertEquals("com.facebook.react:react-android:0.82.0-rc.0", reactSubstitution?.second)
    }

    // === DependencyCoordinates-based tests ===

    @Test
    fun `getDependencySubstitutions with coordinates includes hermes-android to new group substitution`() {
        // Given - RN 0.84 scenario
        val coordinates = DependencyCoordinates(
            reactVersion = "0.84.0",
            hermesVersion = "0.15.0",
            hermesV1Version = "250829098.0.6"
        )

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)

        // Then
        // Verify new substitution rules
        val hermesAndroidSubstitution = substitutions.find {
            it.first == "com.facebook.react:hermes-android"
        }
        assertNotNull(hermesAndroidSubstitution)
        assertEquals("com.facebook.hermes:hermes-android:250829098.0.6", hermesAndroidSubstitution.second)
        assertTrue(hermesAndroidSubstitution.third.contains("moved"))
    }

    @Test
    fun `getDependencySubstitutions with coordinates uses V1 hermes version`() {
        // Given
        val coordinates = DependencyCoordinates(
            reactVersion = "0.84.0",
            hermesVersion = "0.15.0",
            hermesV1Version = "250829098.0.6"
        )

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)

        // Then
        val hermesEngineSubstitution = substitutions.find {
            it.first == "com.facebook.react:hermes-engine"
        }
        // V1 version should be used
        assertEquals("com.facebook.hermes:hermes-android:250829098.0.6", hermesEngineSubstitution?.second)
    }

    @Test
    fun `getDependencySubstitutions with coordinates falls back to classic hermes when V1 empty`() {
        // Given
        val coordinates = DependencyCoordinates(
            reactVersion = "0.84.0",
            hermesVersion = "0.15.0",
            hermesV1Version = "" // No V1
        )

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)

        // Then
        val hermesEngineSubstitution = substitutions.find {
            it.first == "com.facebook.react:hermes-engine"
        }
        assertEquals("com.facebook.hermes:hermes-android:0.15.0", hermesEngineSubstitution?.second)
    }

    @Test
    fun `getDependencySubstitutions with coordinates returns 3 base substitutions for default groups`() {
        // Given
        val coordinates = DependencyCoordinates(
            reactVersion = "0.84.0",
            hermesVersion = "0.15.0",
            hermesV1Version = "250829098.0.6"
        )

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)

        // Then
        assertEquals(3, substitutions.size) // react-native, hermes-engine, hermes-android
    }

    @Test
    fun `getDependencySubstitutions with custom react group adds react-android substitution`() {
        // Given
        val coordinates = DependencyCoordinates(
            reactVersion = "0.84.0",
            hermesVersion = "0.15.0",
            hermesV1Version = "250829098.0.6",
            reactGroup = "io.github.custom"
        )

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)

        // Then
        assertEquals(4, substitutions.size)
        val reactAndroidSubstitution = substitutions.find {
            it.first == "com.facebook.react:react-android"
        }
        assertEquals("io.github.custom:react-android:0.84.0", reactAndroidSubstitution?.second)
    }

    @Test
    fun `getDependencySubstitutions with custom hermes group adds hermes-android substitution`() {
        // Given
        val coordinates = DependencyCoordinates(
            reactVersion = "0.84.0",
            hermesVersion = "0.15.0",
            hermesV1Version = "250829098.0.6",
            hermesGroup = "io.github.custom.hermes"
        )

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)

        // Then
        assertEquals(4, substitutions.size) // base 3 + custom hermes group
        val hermesSubstitution = substitutions.find {
            it.first == "com.facebook.hermes:hermes-android"
        }
        assertEquals("io.github.custom.hermes:hermes-android:250829098.0.6", hermesSubstitution?.second)
    }

    @Test
    fun `getDependencySubstitutions with both custom groups adds all substitutions`() {
        // Given
        val coordinates = DependencyCoordinates(
            reactVersion = "0.84.0",
            hermesVersion = "0.15.0",
            hermesV1Version = "250829098.0.6",
            reactGroup = "io.github.custom",
            hermesGroup = "io.github.custom.hermes"
        )

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)

        // Then
        assertEquals(5, substitutions.size) // base 3 + custom react + custom hermes
    }

    @Test
    fun `getDependencySubstitutions handles Hermes V1 version format correctly`() {
        // Given - Hermes V1 build number format
        val coordinates = DependencyCoordinates(
            reactVersion = "0.84.0",
            hermesVersion = "0.15.0",
            hermesV1Version = "250829098.0.6" // Build number-based
        )

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)

        // Then
        val allHermesSubstitutions = substitutions.filter {
            it.second.contains("hermes-android")
        }
        assertTrue(allHermesSubstitutions.all { it.second.contains("250829098.0.6") })
    }

    // === Tests for existing deprecated API (additional) ===

    @Test
    fun `getDependencySubstitutions with custom group returns 4 substitutions`() {
        // Given
        val version = "0.81.1"
        val group = "io.github.custom"

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(version, group)

        // Then
        assertEquals(4, substitutions.size) // base 2 + custom group 2
    }

    // === Dynamic version substitution tests ===

    @Test
    fun `substitution rules use version-less module selectors for dynamic version matching`() {
        // Given
        val coordinates = DependencyCoordinates(
            reactVersion = "0.84.0",
            hermesVersion = "0.15.0",
            hermesV1Version = "250829098.0.6"
        )

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)

        // Then - All source coordinates should be version-less for dynamic version matching
        val reactNativeSubstitution = substitutions.find {
            it.first == "com.facebook.react:react-native"
        }
        assertNotNull(reactNativeSubstitution)
        // Source has no version (group:artifact format without version)
        assertFalse(reactNativeSubstitution.first.contains(":0."))
        assertFalse(reactNativeSubstitution.first.contains(":+"))
        // Target has version
        assertTrue(reactNativeSubstitution.second.contains(":0.84.0"))
    }

    @Test
    fun `substitution rules match all versions including dynamic versions`() {
        // Given - Scenario where dynamic versions are used
        // When com.facebook.react:react-native:+ is declared
        val coordinates = DependencyCoordinates(
            reactVersion = "0.84.0",
            hermesVersion = "0.15.0",
            hermesV1Version = "250829098.0.6"
        )

        // When
        val substitutions = DependencyConfigurator.getDependencySubstitutions(coordinates)

        // Then - Substitution source should be declared without version
        // Gradle's substitute(module("group:artifact")) matches all versions
        // (+, latest.release, 1.+, 0.84.0, etc.)
        for ((source, target, _) in substitutions) {
            // Source is "group:artifact" format (no version)
            val parts = source.split(":")
            assertEquals(2, parts.size, "Source '$source' should be version-less (group:artifact)")

            // Target is "group:artifact:version" format (with version)
            val targetParts = target.split(":")
            assertEquals(3, targetParts.size, "Target '$target' should have version (group:artifact:version)")
        }
    }
}
