package run.granite.microfrontend

internal interface GraniteMicroFrontendRuntimeEventTarget {
    fun emit(event: GraniteMicroFrontendEvent): Boolean
}

internal class GraniteMicroFrontendRuntimeEventRouter {
    private val lock = Any()
    private val pendingEvents = ArrayDeque<GraniteMicroFrontendEvent>()
    private val attachedTargets = mutableSetOf<GraniteMicroFrontendRuntimeEventTarget>()
    private var activeTarget: GraniteMicroFrontendRuntimeEventTarget? = null
    private var isDelivering = false

    fun attach(target: GraniteMicroFrontendRuntimeEventTarget) {
        synchronized(lock) {
            attachedTargets.add(target)
        }
    }

    fun startEventDelivery(target: GraniteMicroFrontendRuntimeEventTarget) {
        val shouldDrain = synchronized(lock) {
            check(target in attachedTargets) { "Runtime must be attached before starting event delivery" }
            if (activeTarget != null && activeTarget !== target) {
                return
            }
            activeTarget = target
            startDrainIfNeeded()
        }
        if (shouldDrain) {
            drain()
        }
    }

    fun emit(event: GraniteMicroFrontendEvent) {
        val shouldDrain = synchronized(lock) {
            pendingEvents.addLast(event)
            activeTarget ?: return
            if (!startDrainIfNeeded()) {
                return
            }
            true
        }
        if (shouldDrain) {
            drain()
        }
    }

    fun detach(target: GraniteMicroFrontendRuntimeEventTarget) {
        synchronized(lock) {
            attachedTargets.remove(target)
            if (activeTarget === target) {
                activeTarget = null
            }
        }
    }

    private fun startDrainIfNeeded(): Boolean {
        if (isDelivering || pendingEvents.isEmpty()) {
            return false
        }
        isDelivering = true
        return true
    }

    private fun drain() {
        while (true) {
            val (target, event) = synchronized(lock) {
                val target = activeTarget
                if (target == null || pendingEvents.isEmpty()) {
                    isDelivering = false
                    return
                }
                target to pendingEvents.first()
            }
            try {
                if (!target.emit(event)) {
                    val shouldResumeWithReplacement = synchronized(lock) {
                        isDelivering = false
                        activeTarget != null && activeTarget !== target && startDrainIfNeeded()
                    }
                    if (shouldResumeWithReplacement) {
                        drain()
                    }
                    return
                }
                synchronized(lock) {
                    pendingEvents.removeFirst()
                }
            } catch (error: Throwable) {
                val shouldResumeWithReplacement = synchronized(lock) {
                    isDelivering = false
                    activeTarget != null && activeTarget !== target && startDrainIfNeeded()
                }
                if (shouldResumeWithReplacement) {
                    try {
                        drain()
                    } catch (replacementError: Throwable) {
                        error.addSuppressed(replacementError)
                    }
                }
                throw error
            }
        }
    }
}
