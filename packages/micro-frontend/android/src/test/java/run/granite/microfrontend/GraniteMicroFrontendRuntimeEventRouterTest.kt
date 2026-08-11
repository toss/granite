package run.granite.microfrontend

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Collections
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

class GraniteMicroFrontendRuntimeEventRouterTest {
    @Test
    fun `another runtime starting event delivery does not replace the active runtime`() {
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val activeRuntime = RecordingEventTarget()
        val unrelatedRuntime = RecordingEventTarget()
        val event = GraniteMicroFrontendEvent.PreloadApp("shopping")
        router.attach(activeRuntime)
        router.startEventDelivery(activeRuntime)

        router.attach(unrelatedRuntime)
        router.startEventDelivery(unrelatedRuntime)
        router.emit(event)

        assertEquals(listOf(event), activeRuntime.events)
        assertEquals(emptyList<GraniteMicroFrontendEvent>(), unrelatedRuntime.events)
    }

    @Test
    fun `events queued before delivery starts are sent to the runtime that starts delivery`() {
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val runtime = RecordingEventTarget()
        val event = GraniteMicroFrontendEvent.PreloadApp("shopping")
        router.attach(runtime)
        router.emit(event)

        router.startEventDelivery(runtime)

        assertEquals(listOf(event), runtime.events)
    }

    @Test
    fun `new events cannot overtake pending events while delivery starts`() {
        val events = Collections.synchronizedList(mutableListOf<GraniteMicroFrontendEvent>())
        val pendingDeliveryStarted = CountDownLatch(1)
        val continuePendingDelivery = CountDownLatch(1)
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val target = object : GraniteMicroFrontendRuntimeEventTarget {
            override fun emit(event: GraniteMicroFrontendEvent) {
                if (event is GraniteMicroFrontendEvent.OpenApp) {
                    pendingDeliveryStarted.countDown()
                    assertTrue(continuePendingDelivery.await(5, TimeUnit.SECONDS))
                }
                events.add(event)
            }
        }
        val open = GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping")
        val close = GraniteMicroFrontendEvent.CloseApp("session-1")

        router.emit(open)
        router.attach(target)
        val startThread = thread { router.startEventDelivery(target) }
        assertTrue(pendingDeliveryStarted.await(5, TimeUnit.SECONDS))
        val emitThread = thread { router.emit(close) }
        emitThread.join(5_000)

        assertFalse(emitThread.isAlive)
        assertTrue(events.isEmpty())
        continuePendingDelivery.countDown()
        startThread.join(5_000)

        assertFalse(startThread.isAlive)
        assertEquals(listOf(open, close), events)
    }

    @Test
    fun `failed event delivery is retried before newer events`() {
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val open = GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping")
        val close = GraniteMicroFrontendEvent.CloseApp("session-1")
        var shouldFail = true
        val target = object : GraniteMicroFrontendRuntimeEventTarget {
            override fun emit(event: GraniteMicroFrontendEvent) {
                if (shouldFail) {
                    shouldFail = false
                    throw IllegalStateException("delivery failed")
                }
                events.add(event)
            }
        }
        router.attach(target)
        router.startEventDelivery(target)

        assertThrows(IllegalStateException::class.java) { router.emit(open) }
        router.emit(close)

        assertEquals(listOf(open, close), events)
    }

    @Test
    fun `replacement runtime resumes a drain owned by a detached runtime`() {
        val firstEvents = mutableListOf<GraniteMicroFrontendEvent>()
        val secondEvents = mutableListOf<GraniteMicroFrontendEvent>()
        val firstDeliveryStarted = CountDownLatch(1)
        val continueFirstDelivery = CountDownLatch(1)
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val firstTarget = object : GraniteMicroFrontendRuntimeEventTarget {
            override fun emit(event: GraniteMicroFrontendEvent) {
                firstDeliveryStarted.countDown()
                assertTrue(continueFirstDelivery.await(5, TimeUnit.SECONDS))
                firstEvents.add(event)
            }
        }
        val secondTarget = object : GraniteMicroFrontendRuntimeEventTarget {
            override fun emit(event: GraniteMicroFrontendEvent) {
                secondEvents.add(event)
            }
        }
        val open = GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping")
        val close = GraniteMicroFrontendEvent.CloseApp("session-1")
        router.attach(firstTarget)
        router.startEventDelivery(firstTarget)

        val firstEmitThread = thread { router.emit(open) }
        assertTrue(firstDeliveryStarted.await(5, TimeUnit.SECONDS))
        router.detach(firstTarget)
        router.attach(secondTarget)
        router.startEventDelivery(secondTarget)
        router.emit(close)
        continueFirstDelivery.countDown()
        firstEmitThread.join(5_000)

        assertFalse(firstEmitThread.isAlive)
        assertEquals(listOf(open), firstEvents)
        assertEquals(listOf(close), secondEvents)
    }
}

private class RecordingEventTarget : GraniteMicroFrontendRuntimeEventTarget {
    val events = mutableListOf<GraniteMicroFrontendEvent>()

    override fun emit(event: GraniteMicroFrontendEvent) {
        events.add(event)
    }
}
