package run.granite.image.providers

import coil.intercept.Interceptor
import coil.request.ImageResult
import java.util.PriorityQueue
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine
import run.granite.image.GraniteImagePriority

/** Bounds active requests; queued requests are served by priority and then arrival order. */
internal class CoilRequestScheduler(private val limit: Int) : Interceptor {
    private val lock = Any()
    private var active = 0
    private var sequence = 0L
    private val waiting = PriorityQueue<Waiter>(compareByDescending<Waiter> { it.priority.ordinal }.thenBy { it.sequence })

    override suspend fun intercept(chain: Interceptor.Chain): ImageResult =
        withPermit(chain.request.parameters.value(PRIORITY) ?: GraniteImagePriority.NORMAL) {
            chain.proceed(chain.request)
        }

    internal suspend fun <T> withPermit(priority: GraniteImagePriority, block: suspend () -> T): T {
        val permit = acquire(priority)
        try {
            return block()
        } finally {
            permit.release()
        }
    }

    private suspend fun acquire(priority: GraniteImagePriority): Permit = suspendCancellableCoroutine { continuation ->
        val waiter = synchronized(lock) {
            Waiter(priority, sequence++, continuation).also {
                if (active < limit) {
                    active++
                    grant(it)
                } else {
                    waiting.add(it)
                }
            }
        }
        continuation.invokeOnCancellation { synchronized(lock) { waiting.remove(waiter) } }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    private fun grant(waiter: Waiter) {
        val permit = Permit()
        waiter.continuation.resume(permit) { permit.release() }
    }

    private inner class Permit {
        private val released = AtomicBoolean(false)

        fun release() {
            if (!released.compareAndSet(false, true)) return
            synchronized(lock) {
                val next = waiting.poll()
                if (next == null) active-- else grant(next)
            }
        }
    }

    private data class Waiter(
        val priority: GraniteImagePriority,
        val sequence: Long,
        val continuation: CancellableContinuation<Permit>,
    )

    companion object {
        const val PRIORITY = "granite.image.priority"
    }
}
