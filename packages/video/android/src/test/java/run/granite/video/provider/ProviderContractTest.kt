package run.granite.video.provider

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldNotBeEmpty
import run.granite.video.helpers.FakeGraniteVideoProvider

/**
 * Contract tests for GraniteVideoProvider interface.
 * These tests verify that any provider implementation follows the expected contract.
 */
class ProviderContractTest : FunSpec({

    context("GraniteVideoProvider contract") {

        test("provider must have a non-empty providerId") {
            val provider = FakeGraniteVideoProvider()
            provider.providerId.shouldNotBeEmpty()
        }

        test("provider must have a non-empty providerName") {
            val provider = FakeGraniteVideoProvider()
            provider.providerName.shouldNotBeEmpty()
        }

        test("provider delegate should be settable") {
            val provider = FakeGraniteVideoProvider()
            val delegate = object : GraniteVideoDelegate {}

            provider.delegate = delegate
            provider.delegate shouldBe delegate
        }

        test("provider should track play/pause state") {
            val provider = FakeGraniteVideoProvider()

            provider.isPlaying shouldBe false

            provider.play()
            provider.isPlaying shouldBe true

            provider.pause()
            provider.isPlaying shouldBe false
        }

        test("provider should handle seek") {
            val provider = FakeGraniteVideoProvider()

            provider.seek(30.0, 0.5)
            provider.seekCount shouldBe 1
            provider.lastSeekTime shouldBe 30.0
        }

        test("provider should handle volume") {
            val provider = FakeGraniteVideoProvider()

            provider.setVolume(0.5f)
            // Volume should be settable without error
        }

        test("provider should handle mute") {
            val provider = FakeGraniteVideoProvider()

            provider.setMuted(true)
            provider.setMuted(false)
            // Should toggle without error
        }

        test("provider should handle rate") {
            val provider = FakeGraniteVideoProvider()

            provider.setRate(1.5f)
            provider.setRate(0.5f)
            // Rate should be settable without error
        }

        test("provider should handle repeat") {
            val provider = FakeGraniteVideoProvider()

            provider.setRepeat(true)
            provider.setRepeat(false)
            // Repeat should be settable without error
        }

        test("provider should handle resize mode") {
            val provider = FakeGraniteVideoProvider()

            provider.setResizeMode(GraniteVideoResizeMode.CONTAIN)
            provider.setResizeMode(GraniteVideoResizeMode.COVER)
            provider.setResizeMode(GraniteVideoResizeMode.STRETCH)
            provider.setResizeMode(GraniteVideoResizeMode.NONE)
            // All resize modes should be accepted
        }

        test("provider should have valid currentTime and duration") {
            val provider = FakeGraniteVideoProvider()

            provider.currentTime shouldNotBe null
            provider.duration shouldNotBe null
        }
    }

    context("GraniteVideoRegistry contract") {

        beforeTest {
            GraniteVideoRegistry.clear()
        }

        afterTest {
            GraniteVideoRegistry.clear()
        }

        test("registry should allow factory registration") {
            GraniteVideoRegistry.registerFactory("test") { FakeGraniteVideoProvider() }

            GraniteVideoRegistry.getAvailableProviders() shouldBe listOf("test")
        }

        test("registry should create provider from factory") {
            GraniteVideoRegistry.registerFactory("test") { FakeGraniteVideoProvider("test-id") }

            val provider = GraniteVideoRegistry.createProvider("test")
            provider shouldNotBe null
            provider?.providerId shouldBe "test-id"
        }

        test("registry should return null for unknown provider") {
            val provider = GraniteVideoRegistry.createProvider("unknown")
            provider shouldBe null
        }

        test("registry should support default provider") {
            GraniteVideoRegistry.registerFactory("provider1") { FakeGraniteVideoProvider("p1") }
            GraniteVideoRegistry.registerFactory("provider2") { FakeGraniteVideoProvider("p2") }

            GraniteVideoRegistry.setDefaultProvider("provider2")

            val provider = GraniteVideoRegistry.createProvider()
            provider?.providerId shouldBe "p2"
        }

        test("registry should create new instance each time") {
            GraniteVideoRegistry.registerFactory("test") { FakeGraniteVideoProvider() }

            val provider1 = GraniteVideoRegistry.createProvider("test")
            val provider2 = GraniteVideoRegistry.createProvider("test")

            // Should be different instances
            (provider1 === provider2) shouldBe false
        }

        test("registry should provide provider info") {
            GraniteVideoRegistry.registerFactory("test") {
                FakeGraniteVideoProvider("test-id", "Test Provider Name")
            }

            val info = GraniteVideoRegistry.getProviderInfo("test")
            info shouldNotBe null
            info?.id shouldBe "test-id"
            info?.name shouldBe "Test Provider Name"
        }

        test("registry clear should remove all providers") {
            GraniteVideoRegistry.registerFactory("test1") { FakeGraniteVideoProvider() }
            GraniteVideoRegistry.registerFactory("test2") { FakeGraniteVideoProvider() }

            GraniteVideoRegistry.clear()

            GraniteVideoRegistry.getAvailableProviders() shouldBe emptyList()
            GraniteVideoRegistry.hasProvider() shouldBe false
        }
    }
})
