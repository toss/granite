package run.granite.gradle.generators

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class EntryPointGeneratorTest {

    @Test
    fun `generate creates ReactNativeApplicationEntryPoint class with loadReactNative method`() {
        val generated = EntryPointGenerator.generate("com.example.test")
        
        assertThat(generated).contains("package com.facebook.react")
        assertThat(generated).contains("public class ReactNativeApplicationEntryPoint")
        assertThat(generated).contains("public static void loadReactNative(Context context)")
        assertThat(generated).contains("SoLoader.init(context, OpenSourceMergedSoMapping.INSTANCE)")
        assertThat(generated).contains("if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED)")
        assertThat(generated).contains("DefaultNewArchitectureEntryPoint.load()")
    }

    @Test
    fun `generate throws IllegalArgumentException when packageName is null`() {
        assertThatThrownBy {
            EntryPointGenerator.generate(null)
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("Android package name not found")
            .hasMessageContaining("Ensure project has valid android configuration")
    }

    @Test
    fun `generate includes RuntimeException handling for SoLoader failure`() {
        val generated = EntryPointGenerator.generate("com.example.test")
        
        assertThat(generated).contains("try {")
        assertThat(generated).contains("SoLoader.init")
        assertThat(generated).contains("} catch (Exception e) {")
        assertThat(generated).contains("throw new RuntimeException(\"Failed to initialize SoLoader\", e)")
    }
}
