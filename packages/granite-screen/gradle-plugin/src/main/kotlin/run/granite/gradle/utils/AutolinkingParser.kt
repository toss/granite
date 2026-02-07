package run.granite.gradle.utils

import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import run.granite.gradle.models.*

/**
 * Parses react-native config JSON output into typed AutolinkingConfig models.
 *
 * Implements fail-fast error handling:
 * - Throws IllegalArgumentException for malformed JSON with descriptive messages
 * - Follows error format: "[Context] Failed: [Reason]. [Remediation]"
 */
object AutolinkingParser {
    private val gson = Gson()

    /**
     * Parses react-native config JSON string into AutolinkingConfig.
     *
     * @param json JSON string from react-native config command output
     * @return Parsed AutolinkingConfig with validated models
     * @throws IllegalArgumentException if JSON is malformed or missing required fields
     */
    fun parse(json: String): AutolinkingConfig {
        try {
            // Parse JSON into intermediate map structure
            @Suppress("UNCHECKED_CAST")
            val root = gson.fromJson(json, Map::class.java) as Map<String, Any>

            // Extract project info
            val projectMap = root["project"] as? Map<String, Any>
                ?: throw IllegalArgumentException(
                    "react-native config: Failed to parse JSON - missing 'project' field. " +
                    "Ensure react-native CLI is properly configured."
                )

            val project = parseProjectInfo(projectMap)

            // Extract dependencies
            @Suppress("UNCHECKED_CAST")
            val dependenciesMap = root["dependencies"] as? Map<String, Any> ?: emptyMap()
            val dependencies = parseDependencies(dependenciesMap as Map<String, Map<String, Any>>)

            return AutolinkingConfig(
                project = project,
                dependencies = dependencies
            )
        } catch (e: JsonSyntaxException) {
            throw IllegalArgumentException(
                "react-native config: Failed to parse JSON - syntax error. " +
                "Verify command output is valid JSON. Error: ${e.message}",
                e
            )
        } catch (e: ClassCastException) {
            throw IllegalArgumentException(
                "react-native config: Failed to parse JSON - unexpected structure. " +
                "Ensure react-native CLI version is compatible. Error: ${e.message}",
                e
            )
        }
    }

    private fun parseProjectInfo(map: Map<String, Any>): ProjectInfo {
        @Suppress("UNCHECKED_CAST")
        val androidMap = map["android"] as? Map<String, Any>

        return ProjectInfo(
            name = map["name"] as? String,
            version = map["version"] as? String,
            ios = map["ios"] as? Map<String, Any>,
            android = androidMap?.let { parseAndroidProjectConfig(it) }
        )
    }

    private fun parseAndroidProjectConfig(map: Map<String, Any>): AndroidProjectConfig {
        return AndroidProjectConfig(
            sourceDir = map["sourceDir"] as? String,
            manifestPath = map["manifestPath"] as? String,
            packageName = map["packageName"] as? String
        )
    }

    private fun parseDependencies(map: Map<String, Map<String, Any>>): Map<String, DependencyConfig> {
        return map.mapValues { (name, depMap) ->
            parseDependencyConfig(name, depMap)
        }
    }

    private fun parseDependencyConfig(name: String, map: Map<String, Any>): DependencyConfig {
        @Suppress("UNCHECKED_CAST")
        val platformsMap = map["platforms"] as? Map<String, Any>

        return DependencyConfig(
            name = name,
            root = map["root"] as? String ?: "",
            platforms = platformsMap?.let { parsePlatformConfig(it) }
        )
    }

    private fun parsePlatformConfig(map: Map<String, Any>): PlatformConfig {
        @Suppress("UNCHECKED_CAST")
        val androidMap = map["android"] as? Map<String, Any>

        return PlatformConfig(
            ios = map["ios"] as? Map<String, Any>,
            android = androidMap?.let { parseAndroidDependencyConfig(it) }
        )
    }

    private fun parseAndroidDependencyConfig(map: Map<String, Any>): AndroidDependencyConfig {
        @Suppress("UNCHECKED_CAST")
        val componentDescriptorsList = map["componentDescriptors"] as? List<String>
        @Suppress("UNCHECKED_CAST")
        val buildTypesList = map["buildTypes"] as? List<String>

        return AndroidDependencyConfig(
            sourceDir = map["sourceDir"] as? String,
            packageImportPath = map["packageImportPath"] as? String,
            packageInstance = map["packageInstance"] as? String,
            dependencyConfiguration = map["dependencyConfiguration"] as? String,
            buildTypes = buildTypesList,
            libraryName = map["libraryName"] as? String,
            componentDescriptors = componentDescriptorsList,
            cmakeListsPath = map["cmakeListsPath"] as? String,
            cxxModuleCMakeListsPath = map["cxxModuleCMakeListsPath"] as? String,
            cxxModuleCMakeListsModuleName = map["cxxModuleCMakeListsModuleName"] as? String,
            cxxModuleHeaderName = map["cxxModuleHeaderName"] as? String,
            isPureCxxDependency = map["isPureCxxDependency"] as? Boolean
        )
    }
}
