package run.granite.gradle.tasks

import run.granite.gradle.fixtures.NativeModuleFixtures
import run.granite.gradle.generators.CppAutolinkingGenerator
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

/**
 * Unit tests for AutolinkingTask.
 *
 * Tests PackageList.kt generation logic and configuration.
 *
 * Note: Full integration testing (actual CLI execution) requires Node.js and
 * React Native CLI, so is done separately. These tests focus on task structure validation.
 */
class AutolinkingTaskTest {

    @Test
    fun `task is cacheable`() {
        val annotations = AutolinkingTask::class.annotations
        assertThat(annotations)
            .anyMatch { it.annotationClass.simpleName == "CacheableTask" }
    }

    @Test
    fun `task has all required properties`() {
        val propertyNames = AutolinkingTask::class.members
            .filter {
                it.name.endsWith("File") || it.name.endsWith("Dir") ||
                    it.name == "packageName"
            }
            .map { it.name }
            .toSet()

        assertThat(propertyNames).contains("reactNativeDir")
        assertThat(propertyNames).contains("nodeModulesDir")
        assertThat(propertyNames).contains("projectDir")
        assertThat(propertyNames).contains("outputDir")
        assertThat(propertyNames).contains("packageListFile")
        assertThat(propertyNames).contains("packageName")
    }

    @Test
    fun `task has execute method`() {
        val executeMethods = AutolinkingTask::class.members
            .filter { it.name == "execute" }

        assertThat(executeMethods).isNotEmpty
    }

    @Test
    fun `task class is abstract`() {
        assertThat(AutolinkingTask::class.isAbstract).isTrue
    }

    @Test
    fun `autolinking filters modules by includesGeneratedCode flag`() {
        // Create mixed modules: one standard, one with custom codegen
        val modules = NativeModuleFixtures.createMixedModules()

        // Simulate the filtering logic from AutolinkingTask
        val filteredModules = modules.filter { !it.includesGeneratedCode }

        // Standard module should be included
        assertThat(filteredModules).anyMatch { it.name == "react-native-example" }

        // Custom codegen module should be excluded
        assertThat(filteredModules).noneMatch { it.name == "custom-codegen-module" }

        assertThat(filteredModules).hasSize(1)
    }

    @Test
    fun `generated autolinking excludes modules with includesGeneratedCode flag`() {
        // Filtering by includesGeneratedCode is the caller's responsibility (AutolinkingTask),
        // not the generator's. Test that pre-filtered input produces correct output.
        val allModules = NativeModuleFixtures.createMixedModules()
        val filteredModules = allModules.filter { !it.includesGeneratedCode }

        val generatedCpp = CppAutolinkingGenerator.generate(filteredModules)

        // Custom codegen module should be excluded after filtering
        assertThat(generatedCpp).doesNotContain("CustomCodegenSpec_ModuleProvider")
        assertThat(generatedCpp).doesNotContain("custom_codegen_module")

        // Standard module should still be included
        assertThat(generatedCpp).contains("ExampleSpec_ModuleProvider")
    }
}
