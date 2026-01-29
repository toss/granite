package run.granite.video.provider

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import run.granite.video.helpers.FakeGraniteVideoProvider

class GraniteVideoRegistryTest : FunSpec({

    beforeTest {
        GraniteVideoRegistry.clear()
    }

    afterTest {
        GraniteVideoRegistry.clear()
    }

    // ============================================================
    // Clear API Tests
    // ============================================================

    test("clear() should remove all providers") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
        GraniteVideoRegistry.registerFactory("exoplayer2") { FakeGraniteVideoProvider("exoplayer2", "ExoPlayer2") }

        GraniteVideoRegistry.clear()

        GraniteVideoRegistry.getAvailableProviders().shouldBeEmpty()
    }

    test("clear() should make hasProvider() return false") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }

        GraniteVideoRegistry.clear()

        GraniteVideoRegistry.hasProvider() shouldBe false
    }

    test("clear() should make createProvider() return null") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }

        GraniteVideoRegistry.clear()

        GraniteVideoRegistry.createProvider().shouldBeNull()
    }

    // ============================================================
    // Multi-Provider Registration Tests
    // ============================================================

    test("registerFactory should make provider available") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }

        GraniteVideoRegistry.getAvailableProviders() shouldContain "media3"
    }

    test("registerFactory should make hasProvider() return true") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }

        GraniteVideoRegistry.hasProvider() shouldBe true
    }

    test("createProvider with unknown id should return null") {
        val provider = GraniteVideoRegistry.createProvider("unknown")

        provider.shouldBeNull()
    }

    test("multiple providers should all be available") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
        GraniteVideoRegistry.registerFactory("exoplayer2") { FakeGraniteVideoProvider("exoplayer2", "ExoPlayer2") }
        GraniteVideoRegistry.registerFactory("vlc") { FakeGraniteVideoProvider("vlc", "VLC") }

        GraniteVideoRegistry.getAvailableProviders() shouldContainAll listOf("media3", "exoplayer2", "vlc")
    }

    // ============================================================
    // Provider Creation by ID Tests
    // ============================================================

    test("createProvider with valid id should return provider with matching id") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
        GraniteVideoRegistry.registerFactory("exoplayer2") { FakeGraniteVideoProvider("exoplayer2", "ExoPlayer2") }

        val provider = GraniteVideoRegistry.createProvider("exoplayer2")

        provider.shouldNotBeNull()
        provider.providerId shouldBe "exoplayer2"
    }

    test("createProvider called multiple times should create new instance each time") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }

        val provider1 = GraniteVideoRegistry.createProvider("media3")
        val provider2 = GraniteVideoRegistry.createProvider("media3")

        provider1.shouldNotBeNull()
        provider2.shouldNotBeNull()
        provider1 shouldNotBe provider2
    }

    // ============================================================
    // Default Provider Tests
    // ============================================================

    test("createProvider without id should return default provider") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
        GraniteVideoRegistry.registerFactory("exoplayer2") { FakeGraniteVideoProvider("exoplayer2", "ExoPlayer2") }
        GraniteVideoRegistry.setDefaultProvider("exoplayer2")

        val provider = GraniteVideoRegistry.createProvider()

        provider.shouldNotBeNull()
        provider.providerId shouldBe "exoplayer2"
    }

    test("setDefaultProvider should change the default") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
        GraniteVideoRegistry.registerFactory("exoplayer2") { FakeGraniteVideoProvider("exoplayer2", "ExoPlayer2") }
        GraniteVideoRegistry.setDefaultProvider("exoplayer2")

        GraniteVideoRegistry.setDefaultProvider("media3")
        val provider = GraniteVideoRegistry.createProvider()

        provider.shouldNotBeNull()
        provider.providerId shouldBe "media3"
    }

    test("setDefaultProvider with unknown id should make createProvider return null") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
        GraniteVideoRegistry.setDefaultProvider("unknown")

        val provider = GraniteVideoRegistry.createProvider()

        provider.shouldBeNull()
    }

    // ============================================================
    // Provider Info Tests
    // ============================================================

    test("getProviderInfo with valid id should return provider info") {
        GraniteVideoRegistry.registerFactory("vlc") { FakeGraniteVideoProvider("vlc", "VLC Player") }

        val info = GraniteVideoRegistry.getProviderInfo("vlc")

        info.shouldNotBeNull()
        info.id shouldBe "vlc"
        info.name shouldBe "VLC Player"
    }

    test("getProviderInfo with unknown id should return null") {
        val info = GraniteVideoRegistry.getProviderInfo("unknown")

        info.shouldBeNull()
    }

    // ============================================================
    // Overwrite Tests
    // ============================================================

    test("registering same id again should overwrite previous factory") {
        GraniteVideoRegistry.registerFactory("custom") { FakeGraniteVideoProvider("custom", "Custom V1") }

        GraniteVideoRegistry.registerFactory("custom") { FakeGraniteVideoProvider("custom", "Custom V2") }
        val info = GraniteVideoRegistry.getProviderInfo("custom")

        info.shouldNotBeNull()
        info.name shouldBe "Custom V2"
    }

    // ============================================================
    // Backward Compatibility Tests
    // ============================================================

    test("legacy registerFactory without id should work") {
        GraniteVideoRegistry.registerFactory { FakeGraniteVideoProvider("legacy", "Legacy") }

        val provider = GraniteVideoRegistry.createProvider()
        provider.shouldNotBeNull()
        provider.providerId shouldBe "legacy"
    }

    test("legacy registerFactory should make hasProvider() return true") {
        GraniteVideoRegistry.registerFactory { FakeGraniteVideoProvider("legacy", "Legacy") }

        GraniteVideoRegistry.hasProvider() shouldBe true
    }

    // ============================================================
    // Custom Provider Override Tests
    // ============================================================

    test("custom provider should be used when registered before default") {
        GraniteVideoRegistry.registerFactory("custom") { FakeGraniteVideoProvider("custom", "Custom") }
        GraniteVideoRegistry.setDefaultProvider("custom")

        // Even after registering media3
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }

        val provider = GraniteVideoRegistry.createProvider()
        provider.shouldNotBeNull()
        provider.providerId shouldBe "custom"
    }

    test("custom provider should override default when set after registration") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
        GraniteVideoRegistry.setDefaultProvider("media3")

        GraniteVideoRegistry.registerFactory("custom") { FakeGraniteVideoProvider("custom", "Custom") }
        GraniteVideoRegistry.setDefaultProvider("custom")

        val provider = GraniteVideoRegistry.createProvider()
        provider.shouldNotBeNull()
        provider.providerId shouldBe "custom"
    }

    test("createProvider with specific id should work even when different default is set") {
        GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
        GraniteVideoRegistry.registerFactory("custom") { FakeGraniteVideoProvider("custom", "Custom") }
        GraniteVideoRegistry.setDefaultProvider("custom")

        val provider = GraniteVideoRegistry.createProvider("media3")
        provider.shouldNotBeNull()
        provider.providerId shouldBe "media3"
    }
})
