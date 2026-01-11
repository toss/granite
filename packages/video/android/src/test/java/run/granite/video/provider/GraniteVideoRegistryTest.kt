package run.granite.video.provider

import io.kotest.core.spec.style.BehaviorSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import run.granite.video.helpers.FakeGraniteVideoProvider

class GraniteVideoRegistryTest : BehaviorSpec({

    beforeTest {
        GraniteVideoRegistry.clear()
    }

    afterTest {
        GraniteVideoRegistry.clear()
    }

    // ============================================================
    // Clear API Tests
    // ============================================================

    given("registry with providers registered") {
        beforeTest {
            GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
            GraniteVideoRegistry.registerFactory("exoplayer2") { FakeGraniteVideoProvider("exoplayer2", "ExoPlayer2") }
        }

        `when`("clear() is called") {
            GraniteVideoRegistry.clear()

            then("all providers are removed") {
                GraniteVideoRegistry.getAvailableProviders().shouldBeEmpty()
            }

            then("hasProvider() returns false") {
                GraniteVideoRegistry.hasProvider() shouldBe false
            }

            then("createProvider() returns null") {
                GraniteVideoRegistry.createProvider().shouldBeNull()
            }
        }
    }

    // ============================================================
    // Multi-Provider Registration Tests
    // ============================================================

    given("empty registry") {
        `when`("registerFactory is called with id") {
            GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }

            then("provider should be available") {
                GraniteVideoRegistry.getAvailableProviders() shouldContain "media3"
            }

            then("hasProvider() returns true") {
                GraniteVideoRegistry.hasProvider() shouldBe true
            }
        }

        `when`("createProvider is called for unknown id") {
            val provider = GraniteVideoRegistry.createProvider("unknown")

            then("should return null") {
                provider.shouldBeNull()
            }
        }

        `when`("multiple providers are registered") {
            GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
            GraniteVideoRegistry.registerFactory("exoplayer2") { FakeGraniteVideoProvider("exoplayer2", "ExoPlayer2") }
            GraniteVideoRegistry.registerFactory("vlc") { FakeGraniteVideoProvider("vlc", "VLC") }

            then("getAvailableProviders returns all ids") {
                GraniteVideoRegistry.getAvailableProviders() shouldContainAll listOf("media3", "exoplayer2", "vlc")
            }
        }
    }

    // ============================================================
    // Provider Creation by ID Tests
    // ============================================================

    given("registry with multiple providers") {
        beforeTest {
            GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
            GraniteVideoRegistry.registerFactory("exoplayer2") { FakeGraniteVideoProvider("exoplayer2", "ExoPlayer2") }
        }

        `when`("createProvider is called with valid id") {
            val provider = GraniteVideoRegistry.createProvider("exoplayer2")

            then("should return provider with matching id") {
                provider.shouldNotBeNull()
                provider.providerId shouldBe "exoplayer2"
            }
        }

        `when`("createProvider is called multiple times") {
            val provider1 = GraniteVideoRegistry.createProvider("media3")
            val provider2 = GraniteVideoRegistry.createProvider("media3")

            then("should create new instance each time") {
                provider1.shouldNotBeNull()
                provider2.shouldNotBeNull()
                provider1 shouldNotBe provider2
            }
        }
    }

    // ============================================================
    // Default Provider Tests
    // ============================================================

    given("registry with default provider set") {
        beforeTest {
            GraniteVideoRegistry.registerFactory("media3") { FakeGraniteVideoProvider("media3", "Media3") }
            GraniteVideoRegistry.registerFactory("exoplayer2") { FakeGraniteVideoProvider("exoplayer2", "ExoPlayer2") }
            GraniteVideoRegistry.setDefaultProvider("exoplayer2")
        }

        `when`("createProvider is called without id") {
            val provider = GraniteVideoRegistry.createProvider()

            then("should return default provider") {
                provider.shouldNotBeNull()
                provider.providerId shouldBe "exoplayer2"
            }
        }

        `when`("setDefaultProvider is called with new id") {
            GraniteVideoRegistry.setDefaultProvider("media3")
            val provider = GraniteVideoRegistry.createProvider()

            then("should return new default provider") {
                provider.shouldNotBeNull()
                provider.providerId shouldBe "media3"
            }
        }

        `when`("setDefaultProvider is called with unknown id") {
            GraniteVideoRegistry.setDefaultProvider("unknown")
            val provider = GraniteVideoRegistry.createProvider()

            then("createProvider without id returns null") {
                provider.shouldBeNull()
            }
        }
    }

    // ============================================================
    // Provider Info Tests
    // ============================================================

    given("registry with provider registered") {
        beforeTest {
            GraniteVideoRegistry.registerFactory("vlc") { FakeGraniteVideoProvider("vlc", "VLC Player") }
        }

        `when`("getProviderInfo is called with valid id") {
            val info = GraniteVideoRegistry.getProviderInfo("vlc")

            then("should return provider info") {
                info.shouldNotBeNull()
                info.id shouldBe "vlc"
                info.name shouldBe "VLC Player"
            }
        }

        `when`("getProviderInfo is called with unknown id") {
            val info = GraniteVideoRegistry.getProviderInfo("unknown")

            then("should return null") {
                info.shouldBeNull()
            }
        }
    }

    // ============================================================
    // Overwrite Tests
    // ============================================================

    given("registry with existing provider") {
        beforeTest {
            GraniteVideoRegistry.registerFactory("custom") { FakeGraniteVideoProvider("custom", "Custom V1") }
        }

        `when`("same id is registered again") {
            GraniteVideoRegistry.registerFactory("custom") { FakeGraniteVideoProvider("custom", "Custom V2") }
            val info = GraniteVideoRegistry.getProviderInfo("custom")

            then("should overwrite previous factory") {
                info.shouldNotBeNull()
                info.name shouldBe "Custom V2"
            }
        }
    }

    // ============================================================
    // Backward Compatibility Tests
    // ============================================================

    given("legacy API usage") {
        `when`("registerFactory without id is called (legacy)") {
            GraniteVideoRegistry.registerFactory { FakeGraniteVideoProvider("legacy", "Legacy") }

            then("createProvider() should return provider") {
                val provider = GraniteVideoRegistry.createProvider()
                provider.shouldNotBeNull()
                provider.providerId shouldBe "legacy"
            }

            then("hasProvider() returns true") {
                GraniteVideoRegistry.hasProvider() shouldBe true
            }
        }
    }
})
