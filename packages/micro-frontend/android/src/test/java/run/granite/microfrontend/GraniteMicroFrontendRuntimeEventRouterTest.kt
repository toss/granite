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
            override fun emit(event: GraniteMicroFrontendEvent, onDelivered: () -> Unit): Boolean {
                if (event is GraniteMicroFrontendEvent.OpenApp) {
                    pendingDeliveryStarted.countDown()
                    assertTrue(continuePendingDelivery.await(5, TimeUnit.SECONDS))
                }
                events.add(event)
                onDelivered()
                return true
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
            override fun emit(event: GraniteMicroFrontendEvent, onDelivered: () -> Unit): Boolean {
                if (shouldFail) {
                    shouldFail = false
                    throw IllegalStateException("delivery failed")
                }
                events.add(event)
                onDelivered()
                return true
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
            override fun emit(event: GraniteMicroFrontendEvent, onDelivered: () -> Unit): Boolean {
                firstDeliveryStarted.countDown()
                assertTrue(continueFirstDelivery.await(5, TimeUnit.SECONDS))
                firstEvents.add(event)
                onDelivered()
                return true
            }
        }
        val secondTarget = object : GraniteMicroFrontendRuntimeEventTarget {
            override fun emit(event: GraniteMicroFrontendEvent, onDelivered: () -> Unit): Boolean {
                secondEvents.add(event)
                onDelivered()
                return true
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

    @Test
    fun `event rejected by an unavailable runtime is delivered to its replacement`() {
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val unavailableRuntime = object : GraniteMicroFrontendRuntimeEventTarget {
            override fun emit(event: GraniteMicroFrontendEvent, onDelivered: () -> Unit): Boolean = false
        }
        val replacementRuntime = RecordingEventTarget()
        val open = GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping")
        router.attach(unavailableRuntime)
        router.startEventDelivery(unavailableRuntime)

        router.emit(open)
        router.detach(unavailableRuntime)
        router.attach(replacementRuntime)
        router.startEventDelivery(replacementRuntime)

        assertEquals(listOf(open), replacementRuntime.events)
    }

    @Test
    fun `event accepted but never acknowledged is redelivered to the replacement runtime`() {
        val acceptedEvents = mutableListOf<GraniteMicroFrontendEvent>()
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val destroyedRuntime = object : GraniteMicroFrontendRuntimeEventTarget {
            override fun emit(event: GraniteMicroFrontendEvent, onDelivered: () -> Unit): Boolean {
                acceptedEvents.add(event)
                return true
            }
        }
        val replacementRuntime = RecordingEventTarget()
        val open = GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping")
        router.attach(destroyedRuntime)
        router.startEventDelivery(destroyedRuntime)

        router.emit(open)
        router.detach(destroyedRuntime)
        router.attach(replacementRuntime)
        router.startEventDelivery(replacementRuntime)

        assertEquals(listOf(open), acceptedEvents)
        assertEquals(listOf(open), replacementRuntime.events)
    }

    @Test
    fun `acknowledged sessions need fresh registration and keys in a replacement runtime`() {
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val store = GraniteMicroFrontendSessionStore(router::emit)
        val firstRuntime = RecordingEventTarget()
        val replacementRuntime = RecordingEventTarget()
        router.attach(firstRuntime)
        router.startEventDelivery(firstRuntime)
        val previous = store.registerSession("session-1")
        assertTrue(previous.openApp("shopping", "granite://shopping", "runtime-A:session", "runtime-A:root"))
        assertTrue(previous.setVisible(true))

        router.detach(firstRuntime)
        router.attach(replacementRuntime)
        router.startEventDelivery(replacementRuntime)

        // This queue is a delivery log, not an active-session snapshot. The host
        // replaces the opened registration and issues keys for the new runtime.
        assertTrue(replacementRuntime.events.isEmpty())
        assertFalse(previous.openApp("shopping", "granite://shopping", "runtime-A:session", "runtime-A:root"))
        previous.close()
        val current = store.registerSession("session-1")
        assertTrue(current.openApp("shopping", "granite://shopping", "runtime-B:session", "runtime-B:root"))
        assertTrue(current.setVisible(true))
        assertFalse(previous.openApp("shopping", "granite://shopping", "runtime-A:session", "runtime-A:root"))

        assertEquals(
            listOf(
                GraniteMicroFrontendEvent.OpenApp(
                    "session-1", "shopping", "granite://shopping", "runtime-B:session", "runtime-B:root",
                ),
                GraniteMicroFrontendEvent.SessionVisibilityChanged("session-1", true),
            ),
            replacementRuntime.events,
        )
        assertEquals(2, firstRuntime.events.size)
        current.close()
    }

    @Test
    fun `closing a queued session before replacement preserves fresh open ordering`() {
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val store = GraniteMicroFrontendSessionStore(router::emit)
        val unavailable = object : GraniteMicroFrontendRuntimeEventTarget {
            override fun emit(event: GraniteMicroFrontendEvent, onDelivered: () -> Unit): Boolean = true
        }
        router.attach(unavailable)
        router.startEventDelivery(unavailable)
        val previous = store.registerSession("session-1")
        assertTrue(previous.openApp("shopping", "granite://shopping", "runtime-A:session"))
        router.detach(unavailable)

        // Unregister alone does not remove queued events. Close before releasing
        // the registration so a pending old open cannot mask the replacement.
        assertTrue(previous.closeApp())
        previous.close()
        val current = store.registerSession("session-1")
        assertTrue(current.openApp("shopping", "granite://shopping", "runtime-B:session"))
        val replacement = RecordingEventTarget()
        router.attach(replacement)
        router.startEventDelivery(replacement)

        assertEquals(
            listOf(
                GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping", "runtime-A:session"),
                GraniteMicroFrontendEvent.CloseApp("session-1"),
                GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping", "runtime-B:session"),
            ),
            replacement.events,
        )
        current.close()
    }

    @Test
    fun `events beyond the pending limit are dropped while no runtime consumes them`() {
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val runtime = RecordingEventTarget()
        val limit = GraniteMicroFrontendRuntimeEventRouter.MAX_PENDING_EVENTS
        val events = (1..limit + 8).map { GraniteMicroFrontendEvent.PreloadApp("app-$it") }

        events.forEach(router::emit)
        router.attach(runtime)
        router.startEventDelivery(runtime)

        assertEquals(events.take(limit), runtime.events)
    }
}

private class RecordingEventTarget : GraniteMicroFrontendRuntimeEventTarget {
    val events = mutableListOf<GraniteMicroFrontendEvent>()

    override fun emit(event: GraniteMicroFrontendEvent, onDelivered: () -> Unit): Boolean {
        events.add(event)
        onDelivered()
        return true
    }
}
