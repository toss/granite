package run.granite.image.providers

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import run.granite.image.GraniteImagePriority

@OptIn(ExperimentalCoroutinesApi::class)
class CoilRequestSchedulerTest {
    @Test fun `queued requests run by priority and FIFO within a priority`() = runTest {
        val scheduler = CoilRequestScheduler(1)
        val release = CompletableDeferred<Unit>()
        val order = mutableListOf<String>()
        launch { scheduler.withPermit(GraniteImagePriority.NORMAL) { release.await() } }
        runCurrent()
        listOf("low" to GraniteImagePriority.LOW, "high-1" to GraniteImagePriority.HIGH,
            "normal" to GraniteImagePriority.NORMAL, "high-2" to GraniteImagePriority.HIGH).forEach { (name, priority) ->
            launch { scheduler.withPermit(priority) { order.add(name) } }
        }
        runCurrent()
        assertEquals(emptyList<String>(), order)
        release.complete(Unit)
        runCurrent()
        assertEquals(listOf("high-1", "high-2", "normal", "low"), order)
    }

    @Test fun `cancelling waiting and active requests does not leak permits`() = runTest {
        val scheduler = CoilRequestScheduler(1)
        val release = CompletableDeferred<Unit>()
        val active = launch { scheduler.withPermit(GraniteImagePriority.NORMAL) { release.await() } }
        runCurrent()
        val queued = launch { scheduler.withPermit(GraniteImagePriority.HIGH) { error("Cancelled request ran") } }
        runCurrent()
        queued.cancel()
        active.cancel()
        runCurrent()
        var completed = false
        launch { scheduler.withPermit(GraniteImagePriority.LOW) { completed = true } }
        runCurrent()
        assertEquals(true, completed)
    }

    @Test fun `cancellation after a permit is granted releases it`() = runTest {
        val scheduler = CoilRequestScheduler(1)
        val release = CompletableDeferred<Unit>()
        launch { scheduler.withPermit(GraniteImagePriority.NORMAL) { release.await() } }
        runCurrent()
        val queued = launch { scheduler.withPermit(GraniteImagePriority.NORMAL) {} }
        runCurrent()
        release.complete(Unit)
        queued.cancel()
        runCurrent()
        var completed = false
        launch { scheduler.withPermit(GraniteImagePriority.NORMAL) { completed = true } }
        runCurrent()
        assertEquals(true, completed)
    }

    @Test fun `request failures release capacity`() = runTest {
        val scheduler = CoilRequestScheduler(1)
        runCatching { scheduler.withPermit(GraniteImagePriority.NORMAL) { error("failed") } }
        assertEquals(42, scheduler.withPermit(GraniteImagePriority.NORMAL) { 42 })
    }
}
