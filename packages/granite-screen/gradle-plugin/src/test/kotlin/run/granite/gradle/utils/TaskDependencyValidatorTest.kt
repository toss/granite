package run.granite.gradle.utils

import org.gradle.api.DefaultTask
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Unit tests for TaskDependencyValidator.
 */
class TaskDependencyValidatorTest {

  private lateinit var project: org.gradle.api.Project

  @BeforeEach
  fun setup() {
    project = ProjectBuilder.builder().build()
  }

  @Test
  fun `validateRequiredTasks returns empty list when all tasks exist`() {
    // Given
    project.tasks.register("task1", DefaultTask::class.java)
    project.tasks.register("task2", DefaultTask::class.java)

    val requiredTasks = listOf("task1", "task2")

    // When
    val missingTasks = TaskDependencyValidator.validateRequiredTasks(project, requiredTasks)

    // Then
    assertTrue(missingTasks.isEmpty())
  }

  @Test
  fun `validateRequiredTasks returns missing task names`() {
    // Given
    project.tasks.register("task1", DefaultTask::class.java)
    // task2 not registered

    val requiredTasks = listOf("task1", "task2", "task3")

    // When
    val missingTasks = TaskDependencyValidator.validateRequiredTasks(project, requiredTasks)

    // Then
    assertEquals(2, missingTasks.size)
    assertTrue(missingTasks.contains("task2"))
    assertTrue(missingTasks.contains("task3"))
  }

  @Test
  fun `validateRequiredTasks handles empty required tasks list`() {
    // Given
    val requiredTasks = emptyList<String>()

    // When
    val missingTasks = TaskDependencyValidator.validateRequiredTasks(project, requiredTasks)

    // Then
    assertTrue(missingTasks.isEmpty())
  }

  @Test
  fun `validateTaskInputsOutputs warns for tasks without inputs or outputs`() {
    // Given
    val task = project.tasks.register("testTask", DefaultTask::class.java).get()

    // When/Then - Should not throw, just log warning
    TaskDependencyValidator.validateTaskInputsOutputs(project, task)
  }

  @Test
  fun `validateAutolinkingBeforeCodegen validates task dependency`() {
    // Given
    val autolinkingTask = project.tasks.register("autolinking", DefaultTask::class.java).get()
    val codegenTask = project.tasks.register("codegen", DefaultTask::class.java).get()

    // When/Then - Should not throw
    TaskDependencyValidator.validateAutolinkingBeforeCodegen(project, autolinkingTask, codegenTask)
  }

  @Test
  fun `validateCodegenBeforeCompilation validates task dependency`() {
    // Given
    val codegenTask = project.tasks.register("codegen", DefaultTask::class.java).get()
    val compileTask = project.tasks.register("compile", DefaultTask::class.java).get()

    // When/Then - Should not throw
    TaskDependencyValidator.validateCodegenBeforeCompilation(project, codegenTask, compileTask)
  }

  @Test
  fun `validateBundleBeforePackaging validates task dependency`() {
    // Given
    val bundleTask = project.tasks.register("bundle", DefaultTask::class.java).get()
    val packageTask = project.tasks.register("package", DefaultTask::class.java).get()

    // When/Then - Should not throw
    TaskDependencyValidator.validateBundleBeforePackaging(project, bundleTask, packageTask)
  }

  @Test
  fun `validateInfrastructureBeforeVariant validates task dependency`() {
    // Given
    val infrastructureTask = project.tasks.register("infrastructure", DefaultTask::class.java).get()
    val variantTask = project.tasks.register("variant", DefaultTask::class.java).get()

    // When/Then - Should not throw
    TaskDependencyValidator.validateInfrastructureBeforeVariant(project, infrastructureTask, variantTask)
  }

  @Test
  fun `logTaskDependencies logs task information`() {
    // Given
    val task = project.tasks.register("testTask", DefaultTask::class.java).get()

    // When/Then - Should not throw
    TaskDependencyValidator.logTaskDependencies(project, task)
  }
}
