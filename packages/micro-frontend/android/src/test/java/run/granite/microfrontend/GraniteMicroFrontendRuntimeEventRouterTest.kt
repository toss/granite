package run.granite.microfrontend

import org.junit.Assert.assertEquals
import org.junit.Test

class GraniteMicroFrontendRuntimeEventRouterTest {
    @Test
    fun `another runtime starting event delivery does not replace the active runtime`() {
        // Given
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val activeRuntime = RecordingEventTarget()
        val unrelatedRuntime = RecordingEventTarget()
        val event = GraniteMicroFrontendEvent.PreloadApp("shopping")
        router.attach(activeRuntime)
        router.startEventDelivery(activeRuntime)

        // When
        router.attach(unrelatedRuntime)
        router.startEventDelivery(unrelatedRuntime)
        router.emit(event)

        // Then
        assertEquals(listOf(event), activeRuntime.events)
        assertEquals(emptyList<GraniteMicroFrontendEvent>(), unrelatedRuntime.events)
    }

    @Test
    fun `events queued before delivery starts are sent to the runtime that starts delivery`() {
        // Given
        val router = GraniteMicroFrontendRuntimeEventRouter()
        val runtime = RecordingEventTarget()
        val event = GraniteMicroFrontendEvent.PreloadApp("shopping")
        router.attach(runtime)
        router.emit(event)

        // When
        router.startEventDelivery(runtime)

        // Then
        assertEquals(listOf(event), runtime.events)
    }
}

private class RecordingEventTarget : GraniteMicroFrontendRuntimeEventTarget {
    val events = mutableListOf<GraniteMicroFrontendEvent>()

    override fun emit(event: GraniteMicroFrontendEvent) {
        events.add(event)
    }
}
