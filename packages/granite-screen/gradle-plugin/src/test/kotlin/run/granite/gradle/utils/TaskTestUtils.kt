package run.granite.gradle.utils

import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.testfixtures.ProjectBuilder
import java.io.File

/**
 * Test utilities for creating and configuring Gradle tasks in tests.
 */

/**
 * Creates a test project with Android Library plugin applied.
 *
 * @param projectDir Optional project directory (uses temp dir if not specified)
 * @return Configured Gradle project
 */
internal fun createProject(projectDir: File? = null): Project {
    val project = ProjectBuilder.builder()
        .apply {
            if (projectDir != null) {
                withProjectDir(projectDir)
            }
        }
        .build()

    // Apply Android Library plugin for testing
    project.plugins.apply("com.android.library")

    return project
}

/**
 * Creates and registers a test task of the specified type.
 *
 * This helper allows testing of abstract Gradle tasks by using Gradle's
 * task registration mechanism which handles property injection.
 *
 * @param T Task type to create
 * @param project Project to register the task in (defaults to new test project)
 * @param taskName Name for the task (defaults to class simple name)
 * @param block Configuration block to setup task properties
 * @return Configured task instance
 */
internal inline fun <reified T : Task> createTestTask(
    project: Project = createProject(),
    taskName: String = T::class.java.simpleName,
    noinline block: (T) -> Unit = {}
): T = project.tasks.register(taskName, T::class.java, block).get()

/**
 * Creates a test file with specified content.
 *
 * @param parent Parent directory
 * @param name File name
 * @param content File content
 * @return Created file
 */
internal fun createTestFile(parent: File, name: String, content: String): File {
    val file = File(parent, name)
    file.parentFile.mkdirs()
    file.writeText(content)
    return file
}

/**
 * Creates a test directory structure.
 *
 * @param parent Parent directory
 * @param path Directory path (can be nested with /)
 * @return Created directory
 */
internal fun createTestDirectory(parent: File, path: String): File {
    val dir = File(parent, path)
    dir.mkdirs()
    return dir
}

/**
 * Reads a file and returns its content.
 *
 * @param file File to read
 * @return File content as string
 */
internal fun readFileContent(file: File): String {
    require(file.exists()) { "File does not exist: ${file.absolutePath}" }
    return file.readText()
}
