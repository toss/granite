package run.granite.video.provider.scheduler

import android.os.Handler
import android.os.Looper

/**
 * Interface for scheduling periodic progress updates.
 * Abstracted to allow for testability.
 */
interface ProgressScheduler {
    /**
     * Schedule a periodic action.
     * @param intervalMs The interval in milliseconds.
     * @param action The action to execute periodically.
     */
    fun schedule(intervalMs: Long, action: () -> Unit)

    /**
     * Cancel any scheduled actions.
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
    private var action: (() -> Unit)? = null

    override fun schedule(intervalMs: Long, action: () -> Unit) {
        cancel()

        this.intervalMs = intervalMs
        this.action = action

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
        action = null
    }
}
