package run.granite.gradle.generators

import run.granite.gradle.models.NativeModule
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File

class CMakeGeneratorTest {

    @TempDir
    lateinit var tempDir: File

    @Test
    fun `generate with CMake modules creates REACTNATIVE_MERGED_SO and add_subdirectory commands`() {
        // Create actual directory for the test
        val androidDir = File(tempDir, "android")
        androidDir.mkdirs()

        val module = createModuleWithCMake("test-module", "TestLib", "android/CMakeLists.txt")

        val generated = CMakeGenerator.generate(listOf(module), tempDir)

        assertThat(generated).contains("set(REACTNATIVE_MERGED_SO true)")
        assertThat(generated).contains("add_subdirectory(")
        assertThat(generated).contains("TestLib_autolinked_build")
        assertThat(generated).contains("set(AUTOLINKED_LIBRARIES")
        assertThat(generated).contains("react_codegen_TestLib")
    }

    @Test
    fun `generate with no CMake modules creates empty file`() {
        val module = createJavaOnlyModule()

        val generated = CMakeGenerator.generate(listOf(module), tempDir)

        assertThat(generated).contains("# No native modules with CMake configuration found")
        assertThat(generated).contains("set(REACTNATIVE_MERGED_SO true)")
        assertThat(generated).contains("set(AUTOLINKED_LIBRARIES)")
    }

    private fun createModuleWithCMake(name: String, libraryName: String, cmakePath: String): NativeModule {
        return NativeModule(
            name = name,
            packageImportPath = null,
            packageInstance = null,
            dependencyConfiguration = null,
            buildTypes = emptyList(),
            libraryName = libraryName,
            componentDescriptors = emptyList(),
            cmakeListsPath = cmakePath,
            cxxModuleCMakeListsPath = null,
            cxxModuleCMakeListsModuleName = null,
            cxxModuleHeaderName = null,
            isPureCxxDependency = false
        )
    }

    private fun createJavaOnlyModule(): NativeModule {
        return NativeModule(
            name = "java-module",
            packageImportPath = "com.example.Package",
            packageInstance = "new Package()",
            dependencyConfiguration = null,
            buildTypes = emptyList(),
            libraryName = "JavaLib",
            componentDescriptors = emptyList(),
            cmakeListsPath = null,
            cxxModuleCMakeListsPath = null,
            cxxModuleCMakeListsModuleName = null,
            cxxModuleHeaderName = null,
            isPureCxxDependency = false
        )
    }
}
