package run.granite.gradle.utils

import org.gradle.api.Project
import org.gradle.api.Task

/**
 * Validates task dependency structure for Granite plugin.
 *
 * Ensures that:
 * - Codegen tasks complete before compilation tasks
 * - Autolinking completes before codegen
 * - Bundle tasks complete before per-variant packaging tasks
 * - All tasks have proper input/output relationships
 *
 * This validator prevents build failures caused by incorrect task ordering.
 */
object TaskDependencyValidator {

  /**
   * Validates that autolinking completes before codegen.
   *
   * @param project The Gradle project
   * @param autolinkingTask The autolinking task
   * @param codegenTask The codegen task
   */
  fun validateAutolinkingBeforeCodegen(
    project: Project,
    autolinkingTask: Task,
    codegenTask: Task,
  ) {
    if (!codegenTask.dependsOn.contains(autolinkingTask) &&
      !codegenTask.mustRunAfter.getDependencies(codegenTask).contains(autolinkingTask)
    ) {
      project.logger.warn(
        """
                |⚠️ Task dependency warning: Codegen task '${codegenTask.name}' should depend on
                |autolinking task '${autolinkingTask.name}'.
                |
                |This may cause build failures if codegen runs before autolinking completes.
        """.trimMargin(),
      )
    }
  }

  /**
   * Validates that codegen completes before compilation.
   *
   * @param project The Gradle project
   * @param codegenTask The codegen task
   * @param compileTask The compilation task
   */
  fun validateCodegenBeforeCompilation(
    project: Project,
    codegenTask: Task,
    compileTask: Task,
  ) {
    if (!compileTask.dependsOn.contains(codegenTask) &&
      !compileTask.mustRunAfter.getDependencies(compileTask).contains(codegenTask)
    ) {
      project.logger.warn(
        """
                |⚠️ Task dependency warning: Compilation task '${compileTask.name}' should depend on
                |codegen task '${codegenTask.name}'.
                |
                |This may cause compilation errors if codegen outputs are not available.
        """.trimMargin(),
      )
    }
  }

  /**
   * Validates that bundle tasks complete before packaging tasks.
   *
   * @param project The Gradle project
   * @param bundleTask The bundle task
   * @param packageTask The packaging task
   */
  fun validateBundleBeforePackaging(
    project: Project,
    bundleTask: Task,
    packageTask: Task,
  ) {
    if (!packageTask.dependsOn.contains(bundleTask) &&
      !packageTask.mustRunAfter.getDependencies(packageTask).contains(bundleTask)
    ) {
      project.logger.warn(
        """
                |⚠️ Task dependency warning: Packaging task '${packageTask.name}' should depend on
                |bundle task '${bundleTask.name}'.
                |
                |This may cause missing bundle assets in the final AAR.
        """.trimMargin(),
      )
    }
  }

  /**
   * Validates task input/output relationships.
   *
   * Ensures that task outputs are properly declared and consumed by dependent tasks.
   *
   * @param project The Gradle project
   * @param task The task to validate
   */
  fun validateTaskInputsOutputs(project: Project, task: Task) {
    val hasInputs = task.inputs.hasInputs
    val hasOutputs = task.outputs.files.isEmpty.not()

    if (!hasInputs && !hasOutputs) {
      project.logger.warn(
        """
                |⚠️ Task configuration warning: Task '${task.name}' has no declared inputs or outputs.
                |
                |This prevents Gradle's up-to-date checking and caching from working correctly.
                |Consider declaring task inputs and outputs for better build performance.
        """.trimMargin(),
      )
    }
  }

  /**
   * Validates that all required tasks are registered.
   *
   * @param project The Gradle project
   * @param requiredTaskNames List of task names that must be registered
   * @return List of missing task names
   */
  fun validateRequiredTasks(project: Project, requiredTaskNames: List<String>): List<String> {
    val missingTasks = mutableListOf<String>()

    for (taskName in requiredTaskNames) {
      if (project.tasks.findByName(taskName) == null) {
        missingTasks.add(taskName)
      }
    }

    if (missingTasks.isNotEmpty()) {
      project.logger.warn(
        """
                |⚠️ Task registration warning: Required tasks are missing:
                |${missingTasks.joinToString("\n") { "  - $it" }}
                |
                |This may indicate incomplete plugin configuration.
        """.trimMargin(),
      )
    }

    return missingTasks
  }

  /**
   * Validates that per-variant tasks only run after shared infrastructure tasks.
   *
   * Ensures codegen and autolinking (shared) complete before variant-specific bundling.
   *
   * @param project The Gradle project
   * @param infrastructureTask Shared infrastructure task (codegen, autolinking)
   * @param variantTask Per-variant task (bundle, package)
   */
  fun validateInfrastructureBeforeVariant(
    project: Project,
    infrastructureTask: Task,
    variantTask: Task,
  ) {
    if (!variantTask.dependsOn.contains(infrastructureTask) &&
      !variantTask.mustRunAfter.getDependencies(variantTask).contains(infrastructureTask)
    ) {
      project.logger.debug(
        """
                |Task dependency info: Variant task '${variantTask.name}' should typically depend on
                |infrastructure task '${infrastructureTask.name}'.
        """.trimMargin(),
      )
    }
  }

  /**
   * Logs task dependency graph for debugging.
   *
   * @param project The Gradle project
   * @param task The task to log dependencies for
   */
  fun logTaskDependencies(project: Project, task: Task) {
    if (project.logger.isDebugEnabled) {
      val dependencies = task.dependsOn.joinToString(", ") { it.toString() }
      val mustRunAfter = task.mustRunAfter.getDependencies(task)
        .joinToString(", ") { it.name }

      project.logger.debug(
        """
                |Task: ${task.name}
                |  Dependencies: $dependencies
                |  Must run after: $mustRunAfter
        """.trimMargin(),
      )
    }
  }
}
