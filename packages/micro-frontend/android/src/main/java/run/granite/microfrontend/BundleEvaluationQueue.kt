package run.granite.microfrontend

/** Prepares and evaluates one request at a time. Neither queue waits for the other. */
internal class BundleEvaluationQueue<T : AutoCloseable>(
    private val enqueuePreparation: (Runnable) -> Boolean,
    private val prepare: (String) -> T,
    private val enqueueEvaluation: (Runnable) -> Boolean,
    private val evaluate: (T) -> Unit,
) {
    private class Request<T>(
        val path: String,
        val onSuccess: () -> Unit,
        val onError: (Throwable) -> Unit,
        var prepared: T? = null,
    )

    private val lock = Any()
    private val requests = ArrayDeque<Request<T>>()
    private var active: Request<T>? = null
    private var invalidated = false

    fun submit(path: String, onSuccess: () -> Unit, onError: (Throwable) -> Unit) {
        val accepted = synchronized(lock) {
            if (invalidated) false else {
                requests.addLast(Request(path, onSuccess, onError))
                true
            }
        }
        if (accepted) startNext() else onError(IllegalStateException("Bundle runtime was invalidated"))
    }

    fun invalidate() {
        val cancelled = synchronized(lock) {
            invalidated = true
            val pending = listOfNotNull(active) + requests.toList()
            active = null
            requests.clear()
            // A running evaluation owns its buffer locally; only queued buffers can be closed here.
            pending.map { request ->
                val prepared = request.prepared
                request.prepared = null
                request to prepared
            }
        }
        cancelled.forEach { (request, prepared) ->
            runCatching { prepared?.close() }
            runCatching { request.onError(IllegalStateException("Bundle runtime was invalidated")) }
        }
    }

    private fun startNext() {
        val request = synchronized(lock) {
            if (invalidated || active != null || requests.isEmpty()) return
            requests.removeFirst().also { active = it }
        }
        try {
            if (!enqueuePreparation(Runnable { prepareRequest(request) })) {
                finish(request, IllegalStateException("Failed to enqueue bundle preparation"))
            }
        } catch (error: Throwable) {
            finish(request, error)
        }
    }

    private fun prepareRequest(request: Request<T>) {
        if (synchronized(lock) { active !== request }) return
        val prepared = try {
            prepare(request.path)
        } catch (error: Throwable) {
            finish(request, error)
            return
        }
        val retained = synchronized(lock) {
            if (active !== request) false else {
                request.prepared = prepared
                true
            }
        }
        if (!retained) {
            prepared.close()
            return
        }
        try {
            if (!enqueueEvaluation(Runnable { evaluateRequest(request) })) {
                finish(request, IllegalStateException("Failed to enqueue script evaluation on the JS queue"))
            }
        } catch (error: Throwable) {
            finish(request, error)
        }
    }

    private fun evaluateRequest(request: Request<T>) {
        val prepared = synchronized(lock) {
            if (active !== request) return
            checkNotNull(request.prepared).also { request.prepared = null }
        }
        var failure: Throwable? = null
        try {
            evaluate(prepared)
        } catch (error: Throwable) {
            failure = error
        } finally {
            runCatching { prepared.close() }.onFailure { if (failure == null) failure = it }
        }
        finish(request, failure)
    }

    private fun finish(request: Request<T>, error: Throwable?) {
        val prepared = synchronized(lock) {
            if (active !== request) return
            active = null
            request.prepared.also { request.prepared = null }
        }
        runCatching { prepared?.close() }
        try {
            if (error == null) request.onSuccess() else request.onError(error)
        } finally {
            startNext()
        }
    }
}
