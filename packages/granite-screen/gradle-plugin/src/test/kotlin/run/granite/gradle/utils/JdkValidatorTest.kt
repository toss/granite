package run.granite.gradle.utils

import org.gradle.api.JavaVersion
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Unit tests for JdkValidator.
 */
class JdkValidatorTest {

  @Test
  fun `getCurrentVersion returns current Java version`() {
    // When
    val version = JdkValidator.getCurrentVersion()

    // Then
    assertEquals(JavaVersion.current(), version)
  }

  @Test
  fun `getMinimumVersion returns Java 17`() {
    // When
    val version = JdkValidator.getMinimumVersion()

    // Then
    assertEquals(JavaVersion.VERSION_17, version)
  }

  @Test
  fun `isCompatible returns true for JDK 17 and above`() {
    // Given - Current JDK is being used
    val currentJdk = JavaVersion.current()

    // When
    val isCompatible = JdkValidator.isCompatible()

    // Then
    if (currentJdk >= JavaVersion.VERSION_17) {
      assertTrue(isCompatible)
    }
  }

  @Test
  fun `validate succeeds when JDK is 17 or higher`() {
    // Given
    val project = ProjectBuilder.builder().build()
    val currentJdk = JavaVersion.current()

    // When/Then - Should not throw if current JDK >= 17
    if (currentJdk >= JavaVersion.VERSION_17) {
      // Should succeed
      JdkValidator.validate(project)
    } else {
      // Should fail
      assertThrows<IllegalStateException> {
        JdkValidator.validate(project)
      }
    }
  }

  @Test
  fun `validate provides helpful error message for incompatible JDK`() {
    // Given
    val currentJdk = JavaVersion.current()

    // Skip test if running on JDK 17+
    if (currentJdk >= JavaVersion.VERSION_17) {
      return
    }

    // Given
    val project = ProjectBuilder.builder().build()

    // When/Then
    val exception = assertThrows<IllegalStateException> {
      JdkValidator.validate(project)
    }

    // Verify error message contains helpful information
    val message = exception.message ?: ""
    assertTrue(message.contains("JDK 17"))
    assertTrue(message.contains("JAVA_HOME") || message.contains("gradle.properties"))
  }
}
