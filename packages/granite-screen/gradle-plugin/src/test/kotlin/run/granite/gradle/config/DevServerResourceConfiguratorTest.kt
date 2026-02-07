package run.granite.gradle.config

import run.granite.gradle.GraniteExtension
import org.gradle.api.Project
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.io.File
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Unit tests for DevServerResourceConfigurator.
 *
 * Tests the generation of Android resources for React Native development server configuration.
 */
class DevServerResourceConfiguratorTest {

    private lateinit var project: Project
    private lateinit var extension: GraniteExtension
    private lateinit var configurator: DevServerResourceConfigurator
    private lateinit var testResDir: File

    @BeforeEach
    fun setup() {
        project = ProjectBuilder.builder().build()
        project.pluginManager.apply("com.android.library")

        extension = project.extensions.create("granite", GraniteExtension::class.java, project)
        configurator = DevServerResourceConfigurator(project, extension)

        testResDir = File(project.projectDir, "src/debug/res/values")
    }

    @AfterEach
    fun cleanup() {
        // Clean up generated test files
        val debugSrcDir = File(project.projectDir, "src/debug")
        if (debugSrcDir.exists()) {
            debugSrcDir.deleteRecursively()
        }
    }

    @Test
    fun `configurator is created successfully`() {
        assertNotNull(configurator, "DevServerResourceConfigurator should be created")
    }

    @Test
    fun `configure does not generate files when dev server not configured`() {
        // Don't set devServerHost or devServerPort
        configurator.configure()

        // Verify no resources were generated
        assertFalse(
            testResDir.exists(),
            "Resource directory should not be created when dev server is not configured"
        )
    }

    @Test
    fun `configure generates strings xml when host is set`() {
        extension.devServerHost.set("localhost")

        configurator.configure()

        val stringsFile = File(testResDir, "strings.xml")
        assertTrue(stringsFile.exists(), "strings.xml should be generated")
        assertTrue(
            stringsFile.readText().contains("react_native_dev_server_host"),
            "strings.xml should contain dev server host"
        )
        assertTrue(
            stringsFile.readText().contains("localhost"),
            "strings.xml should contain the configured host"
        )
    }

    @Test
    fun `configure generates integers xml when port is set`() {
        extension.devServerPort.set(8081)

        configurator.configure()

        val integersFile = File(testResDir, "integers.xml")
        assertTrue(integersFile.exists(), "integers.xml should be generated")
        assertTrue(
            integersFile.readText().contains("react_native_dev_server_port"),
            "integers.xml should contain dev server port"
        )
        assertTrue(
            integersFile.readText().contains("8081"),
            "integers.xml should contain the configured port"
        )
    }

    @Test
    fun `configure generates both strings and integers when both are set`() {
        extension.devServerHost.set("10.0.2.2")
        extension.devServerPort.set(8082)

        configurator.configure()

        val stringsFile = File(testResDir, "strings.xml")
        val integersFile = File(testResDir, "integers.xml")

        assertTrue(stringsFile.exists(), "strings.xml should be generated")
        assertTrue(integersFile.exists(), "integers.xml should be generated")

        assertTrue(
            stringsFile.readText().contains("10.0.2.2"),
            "strings.xml should contain the configured host"
        )
        assertTrue(
            integersFile.readText().contains("8082"),
            "integers.xml should contain the configured port"
        )
    }

    @Test
    fun `configure generates valid xml format for strings`() {
        extension.devServerHost.set("192.168.1.100")

        configurator.configure()

        val stringsFile = File(testResDir, "strings.xml")
        val content = stringsFile.readText()

        assertTrue(content.contains("<?xml version=\"1.0\" encoding=\"utf-8\"?>"), "Should have XML declaration")
        assertTrue(content.contains("<resources>"), "Should have resources tag")
        assertTrue(content.contains("</resources>"), "Should close resources tag")
        assertTrue(content.contains("translatable=\"false\""), "Should mark as non-translatable")
    }

    @Test
    fun `configure generates valid xml format for integers`() {
        extension.devServerPort.set(9999)

        configurator.configure()

        val integersFile = File(testResDir, "integers.xml")
        val content = integersFile.readText()

        assertTrue(content.contains("<?xml version=\"1.0\" encoding=\"utf-8\"?>"), "Should have XML declaration")
        assertTrue(content.contains("<resources>"), "Should have resources tag")
        assertTrue(content.contains("</resources>"), "Should close resources tag")
        assertTrue(content.contains("<integer name=\"react_native_dev_server_port\">"), "Should have integer tag")
    }

    @Test
    fun `configure can be called multiple times`() {
        extension.devServerHost.set("localhost")
        extension.devServerPort.set(8081)

        // Should not throw when called multiple times
        configurator.configure()
        configurator.configure()

        // Files should still exist
        assertTrue(File(testResDir, "strings.xml").exists())
        assertTrue(File(testResDir, "integers.xml").exists())
    }

    @Test
    fun `configure handles emulator android host`() {
        extension.devServerHost.set("10.0.2.2") // Standard Android emulator host

        configurator.configure()

        val stringsFile = File(testResDir, "strings.xml")
        assertTrue(
            stringsFile.readText().contains("10.0.2.2"),
            "Should handle Android emulator host address"
        )
    }

    @Test
    fun `configure handles custom ports`() {
        extension.devServerPort.set(19000) // Custom Expo port

        configurator.configure()

        val integersFile = File(testResDir, "integers.xml")
        assertTrue(
            integersFile.readText().contains("19000"),
            "Should handle custom port numbers"
        )
    }

    @Test
    fun `configure creates directory structure if not exists`() {
        // Ensure directory doesn't exist
        val debugSrcDir = File(project.projectDir, "src/debug")
        if (debugSrcDir.exists()) {
            debugSrcDir.deleteRecursively()
        }

        extension.devServerHost.set("localhost")
        configurator.configure()

        assertTrue(testResDir.exists(), "Should create directory structure")
    }
}
