package run.granite.microfrontend

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Collections
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

class GraniteMicroFrontendSessionStoreTest {
    @Test
    fun `session emits open visible close in native lifecycle order`() {
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val store = GraniteMicroFrontendSessionStore(events::add)
        val registration = store.registerSession("session-1") {}

        registration.openApp("shopping", "granite://shopping")
        assertTrue(registration.setVisible(true))
        assertTrue(registration.closeApp())
        registration.close()

        assertEquals(
            listOf(
                GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping"),
                GraniteMicroFrontendEvent.SessionVisibilityChanged("session-1", true),
                GraniteMicroFrontendEvent.CloseApp("session-1"),
            ),
            events,
        )
    }

    @Test
    fun `open app is emitted only once per session`() {
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val store = GraniteMicroFrontendSessionStore(events::add)
        val registration = store.registerSession("session-1") {}

        assertTrue(registration.openApp("shopping", "granite://shopping"))
        assertFalse(registration.openApp("shopping", "granite://shopping"))

        assertEquals(
            listOf(GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping")),
            events,
        )
    }

    @Test
    fun `session visibility updates are idempotent per session`() {
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val store = GraniteMicroFrontendSessionStore(events::add)
        val registration = store.registerSession("session-1") {}

        assertTrue(registration.openApp("shopping", "granite://shopping"))
        assertTrue(registration.setVisible(true))
        assertFalse(registration.setVisible(true))
        assertTrue(registration.setVisible(false))
        assertFalse(registration.setVisible(false))

        assertEquals(
            listOf(
                GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping"),
                GraniteMicroFrontendEvent.SessionVisibilityChanged("session-1", true),
                GraniteMicroFrontendEvent.SessionVisibilityChanged("session-1", false),
            ),
            events,
        )
    }

    @Test
    fun `visibility deduplication is isolated per session`() {
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val store = GraniteMicroFrontendSessionStore(events::add)
        val first = store.registerSession("session-1") {}
        val second = store.registerSession("session-2") {}

        assertTrue(first.openApp("shopping", "granite://shopping"))
        assertTrue(second.openApp("payment", "granite://payment"))
        assertTrue(first.setVisible(true))
        assertTrue(second.setVisible(true))
        assertFalse(first.setVisible(true))
        assertFalse(second.setVisible(true))

        assertEquals(
            listOf(
                GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping"),
                GraniteMicroFrontendEvent.OpenApp("session-2", "payment", "granite://payment"),
                GraniteMicroFrontendEvent.SessionVisibilityChanged("session-1", true),
                GraniteMicroFrontendEvent.SessionVisibilityChanged("session-2", true),
            ),
            events,
        )
    }

    @Test
    fun `concurrent close cannot overtake open event delivery`() {
        val events = Collections.synchronizedList(mutableListOf<GraniteMicroFrontendEvent>())
        val openDeliveryStarted = CountDownLatch(1)
        val continueOpenDelivery = CountDownLatch(1)
        val store = GraniteMicroFrontendSessionStore { event ->
            if (event is GraniteMicroFrontendEvent.OpenApp) {
                openDeliveryStarted.countDown()
                assertTrue(continueOpenDelivery.await(5, TimeUnit.SECONDS))
            }
            events.add(event)
        }
        val registration = store.registerSession("session-1") {}
        val openResult = AtomicBoolean()
        val closeResult = AtomicBoolean()
        val closeStarted = CountDownLatch(1)
        val closeCompleted = CountDownLatch(1)

        val openThread = thread {
            openResult.set(registration.openApp("shopping", "granite://shopping"))
        }
        assertTrue(openDeliveryStarted.await(5, TimeUnit.SECONDS))
        val closeThread = thread {
            closeStarted.countDown()
            closeResult.set(registration.closeApp())
            closeCompleted.countDown()
        }
        assertTrue(closeStarted.await(5, TimeUnit.SECONDS))
        val blockedDeadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5)
        while (closeThread.isAlive && closeThread.state != Thread.State.BLOCKED && System.nanoTime() < blockedDeadline) {
            Thread.yield()
        }
        assertEquals(Thread.State.BLOCKED, closeThread.state)

        continueOpenDelivery.countDown()
        openThread.join(5_000)
        closeThread.join(5_000)

        assertFalse(openThread.isAlive)
        assertFalse(closeThread.isAlive)
        assertTrue(openResult.get())
        assertTrue(closeResult.get())
        assertEquals(
            listOf(
                GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping"),
                GraniteMicroFrontendEvent.CloseApp("session-1"),
            ),
            events,
        )
    }

    @Test
    fun `visibility before open and after close is ignored`() {
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val store = GraniteMicroFrontendSessionStore(events::add)
        val registration = store.registerSession("session-1") {}

        assertFalse(registration.setVisible(true))
        assertTrue(registration.openApp("shopping", "granite://shopping"))
        assertTrue(registration.setVisible(true))
        assertTrue(registration.closeApp())
        assertFalse(registration.setVisible(false))

        assertEquals(
            listOf(
                GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping"),
                GraniteMicroFrontendEvent.SessionVisibilityChanged("session-1", true),
                GraniteMicroFrontendEvent.CloseApp("session-1"),
            ),
            events,
        )
    }

    @Test
    fun `request close invokes native close action at most once`() {
        var closeRequests = 0
        val store = GraniteMicroFrontendSessionStore {}
        store.registerSession("session-1") {
            closeRequests += 1
        }

        assertEquals(CloseRequestResult.Accepted, store.requestCloseSession("session-1"))
        assertEquals(CloseRequestResult.Accepted, store.requestCloseSession("session-1"))

        assertEquals(1, closeRequests)
    }

    @Test
    fun `close app is emitted only once after open for actual teardown`() {
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val store = GraniteMicroFrontendSessionStore(events::add)
        val registration = store.registerSession("session-1") {}

        assertFalse(registration.closeApp())
        assertTrue(registration.openApp("shopping", "granite://shopping"))
        assertTrue(registration.closeApp())
        assertFalse(registration.closeApp())
        registration.close()

        assertEquals(
            listOf(
                GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping"),
                GraniteMicroFrontendEvent.CloseApp("session-1"),
            ),
            events,
        )
    }
}
