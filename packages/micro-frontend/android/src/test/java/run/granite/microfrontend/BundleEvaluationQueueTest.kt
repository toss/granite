package run.granite.microfrontend

import java.util.concurrent.CountDownLatch
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit.SECONDS
import org.junit.Assert.*
import org.junit.Test

class BundleEvaluationQueueTest {
    private class WorkQueue {
        val tasks = ArrayDeque<Runnable>()
        var accepting = true
        fun enqueue(task: Runnable): Boolean {
            if (!accepting) return false
            tasks.addLast(task)
            return true
        }
        fun runNext() = tasks.removeFirst().run()
    }

    private class Prepared(val text: String) : AutoCloseable {
        var closes = 0
        override fun close() { closes++ }
    }

    private val native = WorkQueue()
    private val js = WorkQueue()
    private val prepared = mutableListOf<Prepared>()
    private val evaluated = mutableListOf<String>()
    private val results = mutableListOf<String>()

    private fun loader(
        prepare: (String) -> Prepared = { Prepared(it).also(prepared::add) },
        evaluate: (Prepared) -> Unit = { assertEquals(0, it.closes); evaluated += it.text },
    ) = BundleEvaluationQueue(native::enqueue, prepare, js::enqueue, evaluate)

    private fun BundleEvaluationQueue<Prepared>.submit(path: String) =
        submit(path, { results += "ok:$path" }, { results += "error:$path" })

    @Test fun `preparation finishes before JS work and later file changes cannot alter prepared content`() {
        var file = "original"
        val queue = loader(prepare = { Prepared(file).also(prepared::add) })
        queue.submit("bundle")
        assertTrue(prepared.isEmpty())
        native.runNext()
        file = "replaced"
        assertTrue(evaluated.isEmpty())
        js.runNext()
        assertEquals(listOf("original"), evaluated)
        assertEquals(listOf("ok:bundle"), results)
        assertEquals(1, prepared.single().closes)
    }

    @Test fun `requests retain order without preparing several buffers ahead of JS`() {
        val queue = loader()
        queue.submit("first")
        queue.submit("second")
        assertEquals(1, native.tasks.size)
        native.runNext()
        assertTrue(native.tasks.isEmpty())
        js.runNext()
        assertEquals(1, prepared.single().closes)
        native.runNext()
        js.runNext()
        assertEquals(listOf("first", "second"), evaluated)
        assertEquals(listOf("ok:first", "ok:second"), results)
    }

    @Test fun `read failure does not block the next request`() {
        val queue = loader(prepare = { if (it == "bad") error("read failed") else Prepared(it) })
        queue.submit("bad")
        queue.submit("good")
        native.runNext()
        native.runNext()
        js.runNext()
        assertEquals(listOf("error:bad", "ok:good"), results)
    }

    @Test fun `JS queue rejection closes the prepared buffer`() {
        val queue = loader()
        js.accepting = false
        queue.submit("bundle")
        native.runNext()
        assertEquals(1, prepared.single().closes)
        assertEquals(listOf("error:bundle"), results)
    }

    @Test fun `native queue rejection reports failure without preparing`() {
        native.accepting = false
        loader().submit("bundle")
        assertTrue(prepared.isEmpty())
        assertEquals(listOf("error:bundle"), results)
    }

    @Test fun `evaluation failure releases the buffer and continues`() {
        val queue = loader(evaluate = { if (it.text == "bad") error("evaluation failed") })
        queue.submit("bad")
        queue.submit("good")
        native.runNext()
        js.runNext()
        native.runNext()
        js.runNext()
        assertEquals(listOf("error:bad", "ok:good"), results)
        assertTrue(prepared.all { it.closes == 1 })
    }

    @Test fun `invalidation cancels queued preparation and later submissions`() {
        val queue = loader()
        queue.submit("first")
        queue.submit("second")
        queue.invalidate()
        native.runNext()
        queue.submit("late")
        assertTrue(prepared.isEmpty())
        assertEquals(listOf("error:first", "error:second", "error:late"), results)
    }

    @Test fun `invalidation closes a prepared buffer without evaluating it`() {
        val queue = loader()
        queue.submit("bundle")
        native.runNext()
        queue.invalidate()
        js.runNext()
        assertTrue(evaluated.isEmpty())
        assertEquals(1, prepared.single().closes)
        assertEquals(listOf("error:bundle"), results)
    }

    @Test fun `invalidation during preparation closes the late buffer`() {
        lateinit var queue: BundleEvaluationQueue<Prepared>
        queue = loader(prepare = { queue.invalidate(); Prepared(it).also(prepared::add) })
        queue.submit("bundle")
        native.runNext()
        assertTrue(js.tasks.isEmpty())
        assertEquals(1, prepared.single().closes)
        assertEquals(listOf("error:bundle"), results)
    }

    @Test fun `invalidation cannot free a buffer while evaluation is using it`() {
        lateinit var queue: BundleEvaluationQueue<Prepared>
        queue = loader(evaluate = { queue.invalidate(); assertEquals(0, it.closes) })
        queue.submit("bundle")
        native.runNext()
        js.runNext()
        assertEquals(1, prepared.single().closes)
        assertEquals(listOf("error:bundle"), results)
    }

    @Test fun `another thread can invalidate without waiting for an ongoing evaluation`() {
        val entered = CountDownLatch(1)
        val resume = CountDownLatch(1)
        val queue = loader(evaluate = {
            entered.countDown()
            assertTrue(resume.await(5, SECONDS))
            assertEquals(0, it.closes)
        })
        queue.submit("running")
        queue.submit("pending")
        native.runNext()
        val evaluation = FutureTask { js.runNext() }
        Thread(evaluation).start()
        try {
            assertTrue(entered.await(5, SECONDS))
            queue.invalidate()
            queue.invalidate()
            assertEquals(0, prepared.single().closes)
            assertEquals(listOf("error:running", "error:pending"), results)
        } finally {
            resume.countDown()
            evaluation.get(5, SECONDS)
        }
        assertEquals(1, prepared.single().closes)
        assertTrue(native.tasks.isEmpty())
        assertEquals(listOf("error:running", "error:pending"), results)
    }

    @Test fun `throwing JS scheduler releases the buffer and continues with the next request`() {
        var failEnqueue = true
        val queue = BundleEvaluationQueue(
            native::enqueue,
            { path: String -> Prepared(path).also(prepared::add) },
            { task -> if (failEnqueue) error("queue unavailable") else js.enqueue(task) },
            { bundle -> evaluated += bundle.text },
        )
        queue.submit("first")
        queue.submit("second")
        native.runNext()
        assertEquals(1, prepared.single().closes)
        failEnqueue = false
        native.runNext()
        js.runNext()
        assertEquals(listOf("second"), evaluated)
        assertEquals(listOf("error:first", "ok:second"), results)
        assertTrue(prepared.all { it.closes == 1 })
    }
}
