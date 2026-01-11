package run.granite.video.helpers

import run.granite.video.provider.factory.ProgressScheduler

class TestProgressScheduler : ProgressScheduler {
    private var action: (() -> Unit)? = null
    private var _intervalMs: Long = 0

    var scheduledCount = 0
        private set
    var cancelCount = 0
        private set

    val intervalMs: Long get() = _intervalMs
    val isScheduled: Boolean get() = action != null

    override fun schedule(intervalMs: Long, action: () -> Unit) {
        this.action = action
        this._intervalMs = intervalMs
        scheduledCount++
    }

    override fun cancel() {
        action = null
        cancelCount++
    }

    fun tick() {
        action?.invoke()
    }

    fun tick(times: Int) {
        repeat(times) { tick() }
    }

    fun reset() {
        action = null
        _intervalMs = 0
        scheduledCount = 0
        cancelCount = 0
    }
}
