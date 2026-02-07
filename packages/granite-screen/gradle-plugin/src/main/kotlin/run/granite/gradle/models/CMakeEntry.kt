package run.granite.gradle.models

import java.io.File

/**
 * Represents a single add_subdirectory entry in Android-autolinking.cmake.
 *
 * Each CMake entry includes:
 * - sourcePath: Path to the directory containing CMakeLists.txt
 * - buildDirName: Unique build directory name for this module
 * - libraryTargets: List of CMake library targets to be linked
 */
data class CMakeEntry(
    val sourcePath: String,
    val buildDirName: String,
    val libraryTargets: List<String>
) {
    /**
     * Sanitizes the source path for CMake.
     * - Removes trailing /CMakeLists.txt or \CMakeLists.txt
     * - Converts to absolute path if relative
     * - Replaces backslashes with forward slashes
     */
    fun sanitizedPath(moduleRoot: File): String {
        var path = sourcePath.removeSuffix("/CMakeLists.txt")
                             .removeSuffix("\\CMakeLists.txt")

        val file = File(path)
        if (!file.isAbsolute) {
            path = File(moduleRoot, path).canonicalPath
        }

        return path.replace('\\', '/')
    }

    /**
     * Generates the add_subdirectory command line with existence check.
     * Wraps with if(EXISTS ...) to prevent CMake errors during clean
     * when codegen directories don't exist yet.
     */
    fun toCMakeCommand(moduleRoot: File): String {
        val sanitized = sanitizedPath(moduleRoot)
        return """if(EXISTS "$sanitized")
  add_subdirectory("$sanitized" $buildDirName)
endif()"""
    }
}
