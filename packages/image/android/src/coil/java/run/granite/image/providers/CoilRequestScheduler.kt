package run.granite.image.providers

import coil.ImageLoader
import coil.fetch.Fetcher
import coil.fetch.FetchResult
import coil.intercept.Interceptor
import coil.request.ImageResult
import coil.request.Options
import java.util.PriorityQueue
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine
import run.granite.image.GraniteImagePriority

/** Bounds cache misses; queued requests are served by priority and then arrival order. */
internal class CoilRequestScheduler(private val limit: Int) : Interceptor {
    private val lock = Any()
    private var active = 0
    private var sequence = 0L
    private val waiting = PriorityQueue<Waiter>(compareByDescending<Waiter> { it.priority.ordinal }.thenBy { it.sequence })

    override suspend fun intercept(chain: Interceptor.Chain): ImageResult {
        val original = chain.request
        var permit: Permit? = null
        val scheduled = original.newBuilder().fetcherFactory<Any> { data, options, imageLoader ->
            Fetcher {
                // EngineInterceptor checks memory before invoking a fetcher. Acquire here
                // but retain the permit through decoding and transformations in chain.proceed.
                permit = acquire(original.parameters.value(PRIORITY) ?: GraniteImagePriority.NORMAL)
                fetch(data, options, imageLoader, original.fetcherFactory)
            }
        }.build()
        try {
            return chain.proceed(scheduled)
        } finally {
            permit?.release()
        }
    }

    private suspend fun fetch(
        data: Any,
        options: Options,
        imageLoader: ImageLoader,
        requestFactory: Pair<Fetcher.Factory<*>, Class<*>>?,
    ): FetchResult {
        // Preserve a request-specific factory and Coil's ordered component fallback.
        if (requestFactory != null && requestFactory.second.isInstance(data)) {
            @Suppress("UNCHECKED_CAST")
            val factory = requestFactory.first as Fetcher.Factory<Any>
            factory.create(data, options, imageLoader)?.fetch()?.let { return it }
        }
        var startIndex = 0
        while (true) {
            val (fetcher, index) = checkNotNull(imageLoader.components.newFetcher(data, options, imageLoader, startIndex)) {
                "Unable to create a fetcher that supports: $data"
            }
            fetcher.fetch()?.let { return it }
            startIndex = index + 1
        }
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
