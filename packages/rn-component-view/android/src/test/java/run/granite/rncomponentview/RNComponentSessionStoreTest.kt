package run.granite.rncomponentview

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class RNComponentSessionStoreTest {
    private val mainThreadTasks = ArrayDeque<Runnable>()
    private val store = RNComponentSessionStore(mainThreadTasks::addLast)

    @Test
    fun `a renderer that starts later receives open components in open order with their latest props`() {
        val first = store.registerSession("first")
        val second = store.registerSession("second")
        assertTrue(first.openComponent("Demo", mapOf("count" to 1), RNComponentViewSizing.CONTENT_HEIGHT))
        assertFalse(first.openComponent("Other", emptyMap(), RNComponentViewSizing.CONSTRAINED))
        assertTrue(first.updateProps(mapOf("count" to 2)))
        assertFalse(second.updateProps(mapOf("count" to 9)))
        assertTrue(
            second.openComponent(
                "Demo",
                emptyMap(),
                RNComponentViewSizing.CONTENT_SIZE,
                "/bundles/demo.hbc",
            ),
        )
        assertFalse(store.isRendererAttached)

        val sink = FakeEventSink()
        store.startDelivery(sink)

        assertTrue(store.isRendererAttached)
        assertEquals(
            listOf(
                RNComponentEvent.OpenComponent(
                    "first",
                    "Demo",
                    mapOf("count" to 2),
                    RNComponentViewSizing.CONTENT_HEIGHT,
                    null,
                ),
                RNComponentEvent.OpenComponent(
                    "second",
                    "Demo",
                    emptyMap(),
                    RNComponentViewSizing.CONTENT_SIZE,
                    "/bundles/demo.hbc",
                ),
            ),
            sink.events,
        )
    }

    @Test
    fun `an attached renderer receives updates and closes as they happen`() {
        val sink = FakeEventSink()
        store.startDelivery(sink)
        val registration = store.registerSession("session-1")

        registration.openComponent("Demo", emptyMap(), RNComponentViewSizing.CONTENT_HEIGHT)
        assertTrue(registration.updateProps(mapOf("count" to 3)))
        registration.close()
        assertFalse(registration.updateProps(mapOf("count" to 4)))

        assertEquals(
            listOf(
                RNComponentEvent.OpenComponent(
                    "session-1",
                    "Demo",
                    emptyMap(),
                    RNComponentViewSizing.CONTENT_HEIGHT,
                    null,
                ),
                RNComponentEvent.UpdateComponentProps("session-1", mapOf("count" to 3)),
                RNComponentEvent.CloseComponent("session-1"),
            ),
            sink.events,
        )
    }

    @Test
    fun `props are copied when they are handed over`() {
        val sink = FakeEventSink()
        val registration = store.registerSession("session-1")
        val props = mutableMapOf<String, Any?>("count" to 1)

        registration.openComponent("Demo", props, RNComponentViewSizing.CONTENT_HEIGHT)
        props["count"] = 2
        store.startDelivery(sink)

        assertEquals(
            mapOf("count" to 1),
            (sink.events.single() as RNComponentEvent.OpenComponent).props,
        )
    }

    @Test
    fun `a component that never opened closes without an event`() {
        val sink = FakeEventSink()
        store.startDelivery(sink)
        val registration = store.registerSession("session-1")

        registration.close()

        assertEquals(emptyList<RNComponentEvent>(), sink.events)
    }

    @Test
    fun `a session id is registered once until its registration closes`() {
        val registration = store.registerSession("session-1")

        assertThrows(IllegalStateException::class.java) { store.registerSession("session-1") }
        registration.close()
        store.registerSession("session-1")
    }

    @Test
    fun `closing a stale registration keeps the session registered under the same id`() {
        val sink = FakeEventSink()
        store.startDelivery(sink)
        val stale = store.registerSession("session-1")
        stale.close()
        val current = store.registerSession("session-1")
        current.openComponent("Demo", emptyMap(), RNComponentViewSizing.CONTENT_HEIGHT)

        stale.close()

        assertTrue(current.updateProps(mapOf("count" to 1)))
        assertEquals(
            listOf("openComponent", "updateComponentProps"),
            sink.events.map { it.name },
        )
    }

    @Test
    fun `the first live renderer wins and a repeated start resends the open components`() {
        val registration = store.registerSession("session-1")
        registration.openComponent("Demo", emptyMap(), RNComponentViewSizing.CONTENT_HEIGHT)
        val sink = FakeEventSink()
        val restartedSink = FakeEventSink()

        store.startDelivery(sink)
        store.startDelivery(restartedSink)
        store.startDelivery(sink)

        assertEquals(listOf("openComponent", "openComponent"), sink.events.map { it.name })
        assertEquals(emptyList<RNComponentEvent>(), restartedSink.events)

        store.detach(restartedSink)
        assertTrue(store.isRendererAttached)
        store.detach(sink)
        assertFalse(store.isRendererAttached)
        store.startDelivery(restartedSink)
        assertEquals(listOf("openComponent"), restartedSink.events.map { it.name })
    }

    @Test
    fun `renderer listeners hear attach and detach on the main thread`() {
        val states = mutableListOf<Boolean>()
        val listener = RNComponentRendererListener(states::add)
        store.addRendererListener(listener)
        val sink = FakeEventSink()

        store.startDelivery(sink)
        store.startDelivery(sink)
        assertEquals(emptyList<Boolean>(), states)
        runMainThreadTasks()
        assertEquals(listOf(true), states)

        store.detach(sink)
        runMainThreadTasks()
        store.removeRendererListener(listener)
        store.startDelivery(sink)
        runMainThreadTasks()
        assertEquals(listOf(true, false), states)
    }

    @Test
    fun `content sizes reach the open session on the main thread only from the attached renderer`() {
        val sink = FakeEventSink()
        val otherSink = FakeEventSink()
        val registration = store.registerSession("session-1")
        val sizes = mutableListOf<Pair<Float, Float>>()
        registration.contentSizeListener =
            RNComponentContentSizeListener { width, height -> sizes.add(width to height) }

        store.startDelivery(sink)
        store.reportContentSize("session-1", 10f, 20f, sink)
        registration.openComponent("Demo", emptyMap(), RNComponentViewSizing.CONTENT_HEIGHT)
        store.reportContentSize("session-1", 10f, 20f, otherSink)
        store.reportContentSize("session-1", Float.NaN, 20f, sink)
        store.reportContentSize("session-1", 10f, -1f, sink)
        store.reportContentSize("unknown", 10f, 20f, sink)
        store.reportContentSize("session-1", 120f, 48f, sink)
        assertEquals(emptyList<Pair<Float, Float>>(), sizes)

        runMainThreadTasks()
        assertEquals(listOf(120f to 48f), sizes)
    }

    @Test
    fun `a closed session gets no content size that was already on its way`() {
        val sink = FakeEventSink()
        val registration = store.registerSession("session-1")
        val sizes = mutableListOf<Pair<Float, Float>>()
        registration.contentSizeListener =
            RNComponentContentSizeListener { width, height -> sizes.add(width to height) }
        registration.openComponent("Demo", emptyMap(), RNComponentViewSizing.CONTENT_HEIGHT)
        store.startDelivery(sink)

        store.reportContentSize("session-1", 120f, 48f, sink)
        registration.close()
        runMainThreadTasks()

        assertEquals(emptyList<Pair<Float, Float>>(), sizes)
    }

    private fun runMainThreadTasks() {
        while (mainThreadTasks.isNotEmpty()) {
            mainThreadTasks.removeFirst().run()
        }
    }

    private class FakeEventSink : RNComponentEventSink {
        val events = mutableListOf<RNComponentEvent>()

        override fun enqueueEvent(event: RNComponentEvent): Boolean {
            events.add(event)
            return true
        }
    }
}
