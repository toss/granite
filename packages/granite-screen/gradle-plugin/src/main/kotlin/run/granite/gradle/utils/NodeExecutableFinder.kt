package run.granite.gradle.utils

import java.io.File

/**
 * Node.js 실행 파일을 찾는 유틸리티.
 *
 * PATH 환경 변수를 탐색하여 Node.js 실행 파일의 위치를 반환한다.
 * Windows 환경에서는 node.exe, 그 외에는 node를 찾는다.
 */
object NodeExecutableFinder {

  /**
   * Node.js 실행 파일을 찾아서 반환한다.
   *
   * 탐색 순서:
   * 1. PATH 환경 변수에 등록된 디렉토리에서 node 실행 파일 탐색
   * 2. PATH에서 찾지 못한 경우, 시스템이 직접 resolve할 수 있도록 node 이름만 반환 (fallback)
   *
   * @return Node.js 실행 파일의 [File] 객체
   */
  fun findNodeExecutable(): File {
    val nodeName = if (System.getProperty("os.name").startsWith("Windows")) {
      "node.exe"
    } else {
      "node"
    }

    // PATH 환경 변수에서 node 실행 파일 탐색
    val pathEnv = System.getenv("PATH") ?: ""
    val pathDirs = pathEnv.split(File.pathSeparator)

    for (dir in pathDirs) {
      val nodeFile = File(dir, nodeName)
      if (nodeFile.exists() && nodeFile.canExecute()) {
        return nodeFile
      }
    }

    // Fallback: 시스템이 직접 resolve하도록 node 이름만 반환
    return File(nodeName)
  }
}
