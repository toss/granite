package run.granite.gradle.utils

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

/**
 * Unit tests for AutolinkingParser core parsing logic.
 * Tests JSON parsing and error handling.
 */
class AutolinkingParserTest {

    @Test
    fun `parse valid JSON with complete configuration`() {
        val json = """
            {
              "project": {
                "name": "test-project",
                "version": "1.0.0",
                "android": {
                  "sourceDir": "android",
                  "manifestPath": "android/AndroidManifest.xml",
                  "packageName": "com.example.test"
                }
              },
              "dependencies": {
                "react-native-webview": {
                  "name": "react-native-webview",
                  "root": "/path/to/module",
                  "platforms": {
                    "android": {
                      "sourceDir": "android",
                      "packageImportPath": "com.example.Package",
                      "packageInstance": "new Package()",
                      "libraryName": "RNCWebView",
                      "componentDescriptors": ["Component1"],
                      "cmakeListsPath": "android/CMakeLists.txt"
                    }
                  }
                }
              }
            }
        """.trimIndent()

        val config = AutolinkingParser.parse(json)

        // Verify project info
        assertThat(config.project.name).isEqualTo("test-project")
        assertThat(config.project.version).isEqualTo("1.0.0")
        assertThat(config.project.android).isNotNull
        assertThat(config.project.android?.packageName).isEqualTo("com.example.test")

        // Verify dependencies
        assertThat(config.dependencies).hasSize(1)
        assertThat(config.dependencies).containsKey("react-native-webview")

        // Verify Android dependency config
        val androidModules = config.androidDependencies()
        assertThat(androidModules).hasSize(1)
        assertThat(androidModules[0].name).isEqualTo("react-native-webview")
        assertThat(androidModules[0].packageImportPath).isEqualTo("com.example.Package")
        assertThat(androidModules[0].libraryName).isEqualTo("RNCWebView")
    }

    @Test
    fun `parse JSON with null fields treats them as absent`() {
        // Null and missing fields treated identically
        val json = """
            {
              "project": {
                "name": "test-project",
                "version": null,
                "android": {
                  "sourceDir": "android",
                  "manifestPath": null,
                  "packageName": "com.example.test"
                }
              },
              "dependencies": {
                "test-module": {
                  "name": "test-module",
                  "root": "/path",
                  "platforms": {
                    "android": {
                      "sourceDir": "android",
                      "packageImportPath": null,
                      "packageInstance": null,
                      "libraryName": "testlib",
                      "componentDescriptors": null
                    }
                  }
                }
              }
            }
        """.trimIndent()

        val config = AutolinkingParser.parse(json)

        assertThat(config.project.version).isNull()
        assertThat(config.project.android?.manifestPath).isNull()

        val modules = config.androidDependencies()
        assertThat(modules[0].packageImportPath).isNull()
        assertThat(modules[0].packageInstance).isNull()
        assertThat(modules[0].componentDescriptors).isEmpty()
    }

    @Test
    fun `parse JSON with missing dependencies field returns empty dependencies`() {
        val json = """
            {
              "project": {
                "name": "test-project"
              },
              "dependencies": {}
            }
        """.trimIndent()

        val config = AutolinkingParser.parse(json)

        assertThat(config.dependencies).isEmpty()
        assertThat(config.androidDependencies()).isEmpty()
    }

    @Test
    fun `parse JSON with JavaScript-only modules excludes them from androidDependencies`() {
        val json = """
            {
              "project": {
                "name": "test-project"
              },
              "dependencies": {
                "js-only-module": {
                  "name": "js-only-module",
                  "root": "/path",
                  "platforms": {}
                },
                "ios-only-module": {
                  "name": "ios-only-module",
                  "root": "/path",
                  "platforms": {
                    "ios": {
                      "sourceDir": "ios"
                    }
                  }
                }
              }
            }
        """.trimIndent()

        val config = AutolinkingParser.parse(json)

        assertThat(config.dependencies).hasSize(2)
        assertThat(config.androidDependencies()).isEmpty() // No Android modules
    }

    @Test
    fun `throws IllegalArgumentException when JSON is malformed`() {
        // Fail-fast with descriptive error
        val malformedJson = "{ invalid json "

        assertThatThrownBy {
            AutolinkingParser.parse(malformedJson)
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("react-native config")
            .hasMessageContaining("Failed to parse JSON")
            .hasMessageContaining("syntax error")
    }

    @Test
    fun `throws IllegalArgumentException when project field missing`() {
        // Fail-fast with descriptive error
        val json = """
            {
              "dependencies": {}
            }
        """.trimIndent()

        assertThatThrownBy {
            AutolinkingParser.parse(json)
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("react-native config")
            .hasMessageContaining("missing 'project' field")
            .hasMessageContaining("Ensure react-native CLI is properly configured")
    }

    @Test
    fun `throws IllegalArgumentException when JSON has unexpected structure`() {
        // Fail-fast with descriptive error
        val json = """
            {
              "project": "invalid-should-be-object",
              "dependencies": {}
            }
        """.trimIndent()

        assertThatThrownBy {
            AutolinkingParser.parse(json)
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("react-native config")
            // ClassCastException wrapped in IllegalArgumentException
    }

    @Test
    fun `parse handles empty project android field`() {
        val json = """
            {
              "project": {
                "name": "test-project",
                "android": null
              },
              "dependencies": {}
            }
        """.trimIndent()

        val config = AutolinkingParser.parse(json)

        assertThat(config.project.android).isNull()
    }

    @Test
    fun `parse handles all AndroidDependencyConfig fields`() {
        val json = """
            {
              "project": {
                "name": "test-project"
              },
              "dependencies": {
                "complex-module": {
                  "name": "complex-module",
                  "root": "/path",
                  "platforms": {
                    "android": {
                      "sourceDir": "android",
                      "packageImportPath": "com.example.Package",
                      "packageInstance": "new Package()",
                      "buildTypes": ["debug", "release"],
                      "libraryName": "ComplexModule",
                      "componentDescriptors": ["Comp1", "Comp2"],
                      "cmakeListsPath": "android/CMakeLists.txt",
                      "cxxModuleCMakeListsPath": "android/cxx/CMakeLists.txt",
                      "cxxModuleCMakeListsModuleName": "complex_cxx",
                      "cxxModuleHeaderName": "ComplexModule",
                      "isPureCxxDependency": false
                    }
                  }
                }
              }
            }
        """.trimIndent()

        val config = AutolinkingParser.parse(json)
        val modules = config.androidDependencies()

        assertThat(modules).hasSize(1)
        val module = modules[0]

        assertThat(module.packageImportPath).isEqualTo("com.example.Package")
        assertThat(module.packageInstance).isEqualTo("new Package()")
        assertThat(module.libraryName).isEqualTo("ComplexModule")
        assertThat(module.componentDescriptors).containsExactly("Comp1", "Comp2")
        assertThat(module.cmakeListsPath).isEqualTo("android/CMakeLists.txt")
        assertThat(module.cxxModuleCMakeListsPath).isEqualTo("android/cxx/CMakeLists.txt")
        assertThat(module.cxxModuleHeaderName).isEqualTo("ComplexModule")
        assertThat(module.isPureCxxDependency).isFalse
    }

    @Test
    fun `parse handles module with multiple dependencies`() {
        val json = """
            {
              "project": {
                "name": "test-project"
              },
              "dependencies": {
                "module1": {
                  "name": "module1",
                  "root": "/path1",
                  "platforms": {
                    "android": {
                      "sourceDir": "android",
                      "libraryName": "Module1"
                    }
                  }
                },
                "module2": {
                  "name": "module2",
                  "root": "/path2",
                  "platforms": {
                    "android": {
                      "sourceDir": "android",
                      "libraryName": "Module2"
                    }
                  }
                },
                "module3": {
                  "name": "module3",
                  "root": "/path3",
                  "platforms": {
                    "android": {
                      "sourceDir": "android",
                      "libraryName": "Module3"
                    }
                  }
                }
              }
            }
        """.trimIndent()

        val config = AutolinkingParser.parse(json)

        assertThat(config.dependencies).hasSize(3)
        assertThat(config.androidDependencies()).hasSize(3)
        assertThat(config.androidDependencies().map { it.name })
            .containsExactlyInAnyOrder("module1", "module2", "module3")
    }

    @Test
    fun `parse loads fixture JSON file successfully`() {
        val fixtureJson = javaClass.classLoader
            .getResourceAsStream("fixtures/sample-rn-config.json")!!
            .bufferedReader()
            .use { it.readText() }

        val config = AutolinkingParser.parse(fixtureJson)

        assertThat(config.project.name).isEqualTo("test-project")
        assertThat(config.project.android?.packageName).isEqualTo("com.example.testproject")
        assertThat(config.dependencies).hasSize(3)
        assertThat(config.androidDependencies()).hasSize(2) // pure-js-module excluded
    }
}
