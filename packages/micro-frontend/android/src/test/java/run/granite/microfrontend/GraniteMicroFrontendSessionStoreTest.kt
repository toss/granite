package run.granite.microfrontend

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

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

        assertTrue(registration.setVisible(true))
        assertFalse(registration.setVisible(true))
        assertTrue(registration.setVisible(false))
        assertFalse(registration.setVisible(false))

        assertEquals(
            listOf(
                GraniteMicroFrontendEvent.SessionVisibilityChanged("session-1", true),
                GraniteMicroFrontendEvent.SessionVisibilityChanged("session-1", false),
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
