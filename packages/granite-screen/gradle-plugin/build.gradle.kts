plugins {
    `kotlin-dsl`
    `java-gradle-plugin`
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    jvmToolchain(17)
}

repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
}

dependencies {
    // Gradle Plugin API
    implementation(gradleApi())

    // Kotlin standard library
    implementation(kotlin("stdlib"))

    // Android Gradle Plugin (for library module configuration)
    compileOnly(libs.android.gradle.plugin)

    // JSON parsing for package.json and configuration files
    implementation(libs.gson)

    // Testing
    testImplementation(libs.junit.jupiter)
    testImplementation(kotlin("test"))
    testImplementation(gradleTestKit())
    testImplementation(libs.android.gradle.plugin)
    testImplementation(libs.assertj)
    testImplementation(libs.junit.jupiter.api)
    testImplementation(libs.junit.jupiter.params)
}

gradlePlugin {
    plugins {
        create("granitePlugin") {
            id = "run.granite.library"
            implementationClass = "run.granite.gradle.GranitePlugin"
            displayName = "Granite Gradle Plugin"
            description = "Gradle plugin for packaging React Native functionality in Android library modules"
        }
        create("graniteRootPlugin") {
            id = "run.granite.rootproject"
            implementationClass = "run.granite.gradle.GraniteRootProjectPlugin"
            displayName = "Granite Root Project Plugin"
            description = "Gradle plugin for configuring React Native dependency substitution at the root project level"
        }
    }
}

tasks.test {
    useJUnitPlatform()
}
