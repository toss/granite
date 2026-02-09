package run.granite.gradle.utils

import java.io.File

/**
 * Utility for locating the Node.js executable.
 *
 * Searches the PATH environment variable to find the Node.js executable.
 * Looks for node.exe on Windows and node on other platforms.
 */
object NodeExecutableFinder {

  /**
   * Finds and returns the Node.js executable.
   *
   * Search order:
   * 1. Scan directories listed in the PATH environment variable for the node executable
   * 2. If not found in PATH, return just the node name so the system can resolve it (fallback)
   *
   * @return a [File] pointing to the Node.js executable
   */
  fun findNodeExecutable(): File {
    val nodeName = if (System.getProperty("os.name").startsWith("Windows")) {
      "node.exe"
    } else {
      "node"
    }

    // Search for the node executable in PATH directories
    val pathEnv = System.getenv("PATH") ?: ""
    val pathDirs = pathEnv.split(File.pathSeparator)

    for (dir in pathDirs) {
      val nodeFile = File(dir, nodeName)
      if (nodeFile.exists() && nodeFile.canExecute()) {
        return nodeFile
      }
    }

    // Fallback: return just the node name and let the system resolve it
    return File(nodeName)
  }
}
