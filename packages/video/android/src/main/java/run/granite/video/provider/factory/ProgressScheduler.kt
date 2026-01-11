package run.granite.video.provider.factory

import android.os.Handler
import android.os.Looper

/**
 * Interface for scheduling periodic progress updates.
 * Abstracted to allow for testability.
 */
interface ProgressScheduler {
    /**
     * Schedule periodic execution of the given action.
     * @param intervalMs The interval in milliseconds between executions.
     * @param action The action to execute.
     */
    fun schedule(intervalMs: Long, action: () -> Unit)

    /**
     * Cancel any scheduled executions.
     */
    fun cancel()
}

/**
 * Default implementation using Android Handler.
 */
class HandlerProgressScheduler(
    private val handler: Handler = Handler(Looper.getMainLooper())
) : ProgressScheduler {

    private var runnable: Runnable? = null
    private var intervalMs: Long = 0

    override fun schedule(intervalMs: Long, action: () -> Unit) {
        cancel()
        this.intervalMs = intervalMs
        runnable = object : Runnable {
            override fun run() {
                action()
                handler.postDelayed(this, intervalMs)
            }
        }
        handler.post(runnable!!)
    }

    override fun cancel() {
        runnable?.let { handler.removeCallbacks(it) }
        runnable = null
    }
}
