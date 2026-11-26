package run.granite.microfrontend

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GraniteMicroFrontendSessionUnmountTest {
    /** Runs posted blocks only when the test says so, like a main looper that the test drives. */
    private class ManualScheduler : GraniteMainThreadScheduler {
        private val immediate = ArrayDeque<() -> Unit>()
        private val delayed = mutableListOf<Pair<Long, () -> Unit>>()

        override fun post(block: () -> Unit) {
            immediate.addLast(block)
        }

        override fun postDelayed(delayMillis: Long, block: () -> Unit) {
            delayed += delayMillis to block
        }

        fun runPosted() {
            while (immediate.isNotEmpty()) immediate.removeFirst()()
        }

        fun runDelayed() {
            val due = delayed.toList()
            delayed.clear()
            due.forEach { (_, block) -> block() }
            runPosted()
        }
    }

    private fun openedSession(store: GraniteMicroFrontendSessionStore, id: String = "shopping:1") =
        store.registerSession(id).also { it.openApp("shopping", "granite://shopping") }

    @Test
    fun `a closed session is released when JavaScript reports the unmount`() {
        val scheduler = ManualScheduler()
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val store = GraniteMicroFrontendSessionStore(events::add, scheduler)
        val registration = openedSession(store)
        val reasons = mutableListOf<String>()

        assertTrue(registration.closeApp(3_000) { reasons += it })
        registration.close()
        scheduler.runPosted()
        assertEquals(emptyList<String>(), reasons)

        store.sessionDidUnmount("shopping:1")
        scheduler.runPosted()
        scheduler.runDelayed()

        assertEquals(listOf(GraniteMicroFrontendSessionReleaseReason.UNMOUNTED), reasons)
        assertEquals(GraniteMicroFrontendEvent.CloseApp("shopping:1"), events.last())
    }

    @Test
    fun `a closed session is released after the timeout when no report comes`() {
        val scheduler = ManualScheduler()
        val store = GraniteMicroFrontendSessionStore({}, scheduler)
        val reasons = mutableListOf<String>()

        openedSession(store).closeApp(3_000) { reasons += it }
        scheduler.runDelayed()
        store.sessionDidUnmount("shopping:1")
        scheduler.runPosted()

        assertEquals(listOf(GraniteMicroFrontendSessionReleaseReason.TIMEOUT), reasons)
    }

    @Test
    fun `sessions awaiting unmount are released when the runtime is gone`() {
        val scheduler = ManualScheduler()
        val store = GraniteMicroFrontendSessionStore({}, scheduler)
        val reasons = mutableListOf<String>()

        openedSession(store, "shopping:1").closeApp(3_000) { reasons += "1:$it" }
        openedSession(store, "shopping:2").closeApp(3_000) { reasons += "2:$it" }
        store.releaseAllAwaitingUnmount(GraniteMicroFrontendSessionReleaseReason.RUNTIME_DETACHED)
        scheduler.runDelayed()

        assertEquals(listOf("1:runtimeDetached", "2:runtimeDetached"), reasons)
    }

    @Test
    fun `a session that never opened is released at once`() {
        val scheduler = ManualScheduler()
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val store = GraniteMicroFrontendSessionStore(events::add, scheduler)
        val reasons = mutableListOf<String>()

        assertFalse(store.registerSession("shopping:1").closeApp(3_000) { reasons += it })
        scheduler.runPosted()

        assertEquals(listOf(GraniteMicroFrontendSessionReleaseReason.NOT_OPENED), reasons)
        assertEquals(emptyList<GraniteMicroFrontendEvent>(), events)
    }

    @Test
    fun `a second closeApp while the unmount is awaited waits for the same release`() {
        val scheduler = ManualScheduler()
        val events = mutableListOf<GraniteMicroFrontendEvent>()
        val store = GraniteMicroFrontendSessionStore(events::add, scheduler)
        val registration = openedSession(store)
        val reasons = mutableListOf<String>()

        assertTrue(registration.closeApp(3_000) { reasons += "first:$it" })
        assertFalse(registration.closeApp(3_000) { reasons += "second:$it" })
        scheduler.runPosted()
        assertEquals(emptyList<String>(), reasons)

        store.sessionDidUnmount("shopping:1")
        scheduler.runPosted()
        scheduler.runDelayed()

        assertEquals(listOf("first:unmounted", "second:unmounted"), reasons)
        assertEquals(1, events.count { it == GraniteMicroFrontendEvent.CloseApp("shopping:1") })
    }

    @Test
    fun `a second closeApp after close() still waits for the same release`() {
        val scheduler = ManualScheduler()
        val store = GraniteMicroFrontendSessionStore({}, scheduler)
        val registration = openedSession(store)
        val reasons = mutableListOf<String>()

        registration.closeApp(3_000) { reasons += "first:$it" }
        registration.close()
        assertFalse(registration.closeApp(3_000) { reasons += "second:$it" })
        scheduler.runPosted()
        assertEquals(emptyList<String>(), reasons)

        scheduler.runDelayed()

        assertEquals(listOf("first:timeout", "second:timeout"), reasons)
    }

    @Test
    fun `a closeApp after the release is released at once`() {
        val scheduler = ManualScheduler()
        val store = GraniteMicroFrontendSessionStore({}, scheduler)
        val registration = openedSession(store)
        val reasons = mutableListOf<String>()

        registration.closeApp(3_000) { reasons += "first:$it" }
        store.sessionDidUnmount("shopping:1")
        scheduler.runPosted()
        assertFalse(registration.closeApp(3_000) { reasons += "second:$it" })
        scheduler.runPosted()

        assertEquals(listOf("first:unmounted", "second:notOpened"), reasons)
    }

    @Test
    fun `an unmount report for an unknown session does nothing`() {
        val scheduler = ManualScheduler()
        val store = GraniteMicroFrontendSessionStore({}, scheduler)
        val reasons = mutableListOf<String>()
        openedSession(store).closeApp(3_000) { reasons += it }

        store.sessionDidUnmount("shopping:2")
        scheduler.runPosted()

        assertEquals(emptyList<String>(), reasons)
    }
}
