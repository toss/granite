package run.granite.gradle.models

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

/**
 * Unit tests for AutolinkingConfig filtering logic.
 * Tests androidDependencies, javaModules, cxxModules, fabricModules, cmakeModules filtering.
 */
class AutolinkingConfigTest {

  @Test
  fun `androidDependencies filters only modules with Android platform config`() {
    val config = AutolinkingConfig(
      project = ProjectInfo(
        name = "test-project",
        version = "1.0.0",
        ios = null,
        android = AndroidProjectConfig(
          sourceDir = "android",
          manifestPath = "android/AndroidManifest.xml",
          packageName = "com.example.test",
        ),
      ),
      dependencies = mapOf(
        "module1" to DependencyConfig(
          name = "module1",
          root = "/path/to/module1",
          platforms = PlatformConfig(
            ios = null,
            android = AndroidDependencyConfig(
              sourceDir = "android",
              packageImportPath = "com.module1.Package",
              packageInstance = "new Package()",
              dependencyConfiguration = null,
              buildTypes = null,
              libraryName = "module1",
              componentDescriptors = null,
              cmakeListsPath = null,
              cxxModuleCMakeListsPath = null,
              cxxModuleCMakeListsModuleName = null,
              cxxModuleHeaderName = null,
              isPureCxxDependency = null,
            ),
          ),
        ),
        "module2" to DependencyConfig(
          name = "module2",
          root = "/path/to/module2",
          platforms = null, // No platforms - should be excluded
        ),
        "module3" to DependencyConfig(
          name = "module3",
          root = "/path/to/module3",
          platforms = PlatformConfig(
            ios = emptyMap(),
            android = null, // No Android config - should be excluded
          ),
        ),
      ),
    )

    val androidModules = config.androidDependencies()

    // Only module1 should be included
    assertThat(androidModules).hasSize(1)
    assertThat(androidModules[0].name).isEqualTo("module1")
  }

  @Test
  fun `javaModules filters only modules with Java implementation`() {
    val config = AutolinkingConfig(
      project = ProjectInfo("test", null, null, null),
      dependencies = mapOf(
        "java-module" to DependencyConfig(
          name = "java-module",
          root = "/path",
          platforms = PlatformConfig(
            ios = null,
            android = AndroidDependencyConfig(
              sourceDir = "android",
              packageImportPath = "com.example.Package",
              packageInstance = "new Package()",
              dependencyConfiguration = null,
              buildTypes = null,
              libraryName = "javamodule",
              componentDescriptors = null,
              cmakeListsPath = null,
              cxxModuleCMakeListsPath = null,
              cxxModuleCMakeListsModuleName = null,
              cxxModuleHeaderName = null,
              isPureCxxDependency = null,
            ),
          ),
        ),
        "cxx-only-module" to DependencyConfig(
          name = "cxx-only-module",
          root = "/path",
          platforms = PlatformConfig(
            ios = null,
            android = AndroidDependencyConfig(
              sourceDir = "android",
              packageImportPath = null, // No Java
              packageInstance = null,
              dependencyConfiguration = null,
              buildTypes = null,
              libraryName = "cxxmodule",
              componentDescriptors = null,
              cmakeListsPath = null,
              cxxModuleCMakeListsPath = null,
              cxxModuleCMakeListsModuleName = null,
              cxxModuleHeaderName = "CxxModule",
              isPureCxxDependency = true,
            ),
          ),
        ),
      ),
    )

    val javaModules = config.javaModules()

    // Only java-module should be included
    assertThat(javaModules).hasSize(1)
    assertThat(javaModules[0].name).isEqualTo("java-module")
    assertThat(javaModules[0].hasJavaImplementation).isTrue
  }

  @Test
  fun `cxxModules filters only modules with C++ implementation`() {
    val config = AutolinkingConfig(
      project = ProjectInfo("test", null, null, null),
      dependencies = mapOf(
        "java-only-module" to DependencyConfig(
          name = "java-only-module",
          root = "/path",
          platforms = PlatformConfig(
            ios = null,
            android = AndroidDependencyConfig(
              sourceDir = "android",
              packageImportPath = "com.example.Package",
              packageInstance = "new Package()",
              dependencyConfiguration = null,
              buildTypes = null,
              libraryName = "javamodule",
              componentDescriptors = null,
              cmakeListsPath = null,
              cxxModuleCMakeListsPath = null,
              cxxModuleCMakeListsModuleName = null,
              cxxModuleHeaderName = null, // No C++
              isPureCxxDependency = null,
            ),
          ),
        ),
        "cxx-module" to DependencyConfig(
          name = "cxx-module",
          root = "/path",
          platforms = PlatformConfig(
            ios = null,
            android = AndroidDependencyConfig(
              sourceDir = "android",
              packageImportPath = null,
              packageInstance = null,
              dependencyConfiguration = null,
              buildTypes = null,
              libraryName = "cxxmodule",
              componentDescriptors = null,
              cmakeListsPath = null,
              cxxModuleCMakeListsPath = null,
              cxxModuleCMakeListsModuleName = null,
              cxxModuleHeaderName = "CxxModule", // Has C++
              isPureCxxDependency = true,
            ),
          ),
        ),
      ),
    )

    val cxxModules = config.cxxModules()

    // Only cxx-module should be included
    assertThat(cxxModules).hasSize(1)
    assertThat(cxxModules[0].name).isEqualTo("cxx-module")
    assertThat(cxxModules[0].hasCxxImplementation).isTrue
  }

  @Test
  fun `fabricModules filters only modules with Fabric components`() {
    val config = AutolinkingConfig(
      project = ProjectInfo("test", null, null, null),
      dependencies = mapOf(
        "no-fabric-module" to DependencyConfig(
          name = "no-fabric-module",
          root = "/path",
          platforms = PlatformConfig(
            ios = null,
            android = AndroidDependencyConfig(
              sourceDir = "android",
              packageImportPath = "com.example.Package",
              packageInstance = "new Package()",
              dependencyConfiguration = null,
              buildTypes = null,
              libraryName = "nofabric",
              componentDescriptors = null, // No Fabric
              cmakeListsPath = null,
              cxxModuleCMakeListsPath = null,
              cxxModuleCMakeListsModuleName = null,
              cxxModuleHeaderName = null,
              isPureCxxDependency = null,
            ),
          ),
        ),
        "fabric-module" to DependencyConfig(
          name = "fabric-module",
          root = "/path",
          platforms = PlatformConfig(
            ios = null,
            android = AndroidDependencyConfig(
              sourceDir = "android",
              packageImportPath = null,
              packageInstance = null,
              dependencyConfiguration = null,
              buildTypes = null,
              libraryName = "fabricmodule",
              componentDescriptors = listOf("MyComponent", "AnotherComponent"), // Has Fabric
              cmakeListsPath = null,
              cxxModuleCMakeListsPath = null,
              cxxModuleCMakeListsModuleName = null,
              cxxModuleHeaderName = null,
              isPureCxxDependency = null,
            ),
          ),
        ),
      ),
    )

    val fabricModules = config.fabricModules()

    // Only fabric-module should be included
    assertThat(fabricModules).hasSize(1)
    assertThat(fabricModules[0].name).isEqualTo("fabric-module")
    assertThat(fabricModules[0].hasFabricComponents).isTrue
    assertThat(fabricModules[0].componentDescriptors).hasSize(2)
  }

  @Test
  fun `cmakeModules filters only modules with CMake configuration`() {
    val config = AutolinkingConfig(
      project = ProjectInfo("test", null, null, null),
      dependencies = mapOf(
        "no-cmake-module" to DependencyConfig(
          name = "no-cmake-module",
          root = "/path",
          platforms = PlatformConfig(
            ios = null,
            android = AndroidDependencyConfig(
              sourceDir = "android",
              packageImportPath = "com.example.Package",
              packageInstance = "new Package()",
              dependencyConfiguration = null,
              buildTypes = null,
              libraryName = "nocmake",
              componentDescriptors = null,
              cmakeListsPath = null, // No CMake
              cxxModuleCMakeListsPath = null,
              cxxModuleCMakeListsModuleName = null,
              cxxModuleHeaderName = null,
              isPureCxxDependency = null,
            ),
          ),
        ),
        "cmake-module" to DependencyConfig(
          name = "cmake-module",
          root = "/path",
          platforms = PlatformConfig(
            ios = null,
            android = AndroidDependencyConfig(
              sourceDir = "android",
              packageImportPath = null,
              packageInstance = null,
              dependencyConfiguration = null,
              buildTypes = null,
              libraryName = "cmakemodule",
              componentDescriptors = null,
              cmakeListsPath = "android/CMakeLists.txt", // Has CMake
              cxxModuleCMakeListsPath = null,
              cxxModuleCMakeListsModuleName = null,
              cxxModuleHeaderName = null,
              isPureCxxDependency = null,
            ),
          ),
        ),
      ),
    )

    val cmakeModules = config.cmakeModules()

    // Only cmake-module should be included
    assertThat(cmakeModules).hasSize(1)
    assertThat(cmakeModules[0].name).isEqualTo("cmake-module")
    assertThat(cmakeModules[0].hasCMakeConfiguration).isTrue
  }

  @Test
  fun `filtering methods work correctly with mixed modules`() {
    val config = AutolinkingConfig(
      project = ProjectInfo("test", null, null, null),
      dependencies = mapOf(
        "java-only" to createDependency("java-only", hasJava = true),
        "cxx-only" to createDependency("cxx-only", hasCxx = true),
        "fabric-only" to createDependency("fabric-only", hasFabric = true),
        "cmake-only" to createDependency("cmake-only", hasCMake = true),
        "mixed" to createDependency("mixed", hasJava = true, hasCxx = true, hasFabric = true, hasCMake = true),
      ),
    )

    assertThat(config.androidDependencies()).hasSize(5)
    assertThat(config.javaModules()).hasSize(2) // java-only, mixed
    assertThat(config.cxxModules()).hasSize(2) // cxx-only, mixed
    assertThat(config.fabricModules()).hasSize(2) // fabric-only, mixed
    assertThat(config.cmakeModules()).hasSize(2) // cmake-only, mixed
  }

  private fun createDependency(
    name: String,
    hasJava: Boolean = false,
    hasCxx: Boolean = false,
    hasFabric: Boolean = false,
    hasCMake: Boolean = false,
  ): DependencyConfig = DependencyConfig(
    name = name,
    root = "/path/to/$name",
    platforms = PlatformConfig(
      ios = null,
      android = AndroidDependencyConfig(
        sourceDir = "android",
        packageImportPath = if (hasJava) "com.example.$name.Package" else null,
        packageInstance = if (hasJava) "new Package()" else null,
        dependencyConfiguration = null,
        buildTypes = null,
        libraryName = name,
        componentDescriptors = if (hasFabric) listOf("${name}Component") else null,
        cmakeListsPath = if (hasCMake) "android/CMakeLists.txt" else null,
        cxxModuleCMakeListsPath = null,
        cxxModuleCMakeListsModuleName = null,
        cxxModuleHeaderName = if (hasCxx) "${name}Module" else null,
        isPureCxxDependency = hasCxx,
      ),
    ),
  )
}
