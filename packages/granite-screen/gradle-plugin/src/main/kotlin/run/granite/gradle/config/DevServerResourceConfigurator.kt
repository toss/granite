package run.granite.gradle.config

import org.gradle.api.Project
import run.granite.gradle.GraniteExtension
import java.io.File

/**
 * Configurator for development server resource generation.
 *
 * Generates Android resources for React Native development server configuration:
 * - res/values/strings.xml: Dev server host
 * - res/values/integers.xml: Dev server port
 *
 * These resources are used by React Native's DevSupportManager for connecting
 * to the Metro bundler during development.
 */
class DevServerResourceConfigurator(
  private val project: Project,
  private val extension: GraniteExtension,
) {

  /**
   * Generates dev server configuration resources for debug builds.
   *
   * Creates:
   * - src/debug/res/values/strings.xml with react_native_dev_server_host
   * - src/debug/res/values/integers.xml with react_native_dev_server_port
   *
   * Only generates resources if devServerHost and devServerPort are configured.
   */
  fun configure() {
    val devServerHost = extension.devServerHost.orNull
    val devServerPort = extension.devServerPort.orNull

    if (devServerHost == null && devServerPort == null) {
      project.logger.debug("Dev server configuration not set, skipping resource generation")
      return
    }

    // Generate debug variant resources
    val debugResDir = project.file("src/debug/res/values")
    debugResDir.mkdirs()

    if (devServerHost != null) {
      generateStringsXml(debugResDir, devServerHost)
    }

    if (devServerPort != null) {
      generateIntegersXml(debugResDir, devServerPort)
    }

    project.logger.lifecycle(
      "Dev server resources generated: host=${devServerHost ?: "default"}, port=${devServerPort ?: "default"}",
    )
  }

  /**
   * Generates strings.xml with dev server host configuration.
   */
  private fun generateStringsXml(resDir: File, host: String) {
    val stringsFile = File(resDir, "strings.xml")

    val content = """
            <?xml version="1.0" encoding="utf-8"?>
            <resources>
                <!-- React Native Metro bundler development server host -->
                <string name="react_native_dev_server_host" translatable="false">${escapeXml(host)}</string>
            </resources>
    """.trimIndent()

    stringsFile.writeText(content)
    project.logger.debug("Generated ${stringsFile.absolutePath}")
  }

  /**
   * Escapes special XML characters to prevent injection vulnerabilities.
   */
  private fun escapeXml(value: String): String = value.replace("&", "&amp;")
    .replace("<", "&lt;")
    .replace(">", "&gt;")
    .replace("\"", "&quot;")
    .replace("'", "&apos;")

  /**
   * Generates integers.xml with dev server port configuration.
   */
  private fun generateIntegersXml(resDir: File, port: Int) {
    val integersFile = File(resDir, "integers.xml")

    val content = """
            <?xml version="1.0" encoding="utf-8"?>
            <resources>
                <!-- React Native Metro bundler development server port -->
                <integer name="react_native_dev_server_port">$port</integer>
            </resources>
    """.trimIndent()

    integersFile.writeText(content)
    project.logger.debug("Generated ${integersFile.absolutePath}")
  }
}
