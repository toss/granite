package run.granite.microfrontend

internal interface GraniteMicroFrontendRuntimeEventTarget {
    fun emit(event: GraniteMicroFrontendEvent)
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
            drain(target)
        }
    }

    fun emit(event: GraniteMicroFrontendEvent) {
        val target = synchronized(lock) {
            pendingEvents.addLast(event)
            val target = activeTarget ?: return
            if (!startDrainIfNeeded()) {
                return
            }
            target
        }
        drain(target)
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

    private fun drain(target: GraniteMicroFrontendRuntimeEventTarget) {
        while (true) {
            val event = synchronized(lock) {
                if (activeTarget !== target || pendingEvents.isEmpty()) {
                    isDelivering = false
                    return
                }
                pendingEvents.removeFirst()
            }
            try {
                target.emit(event)
            } catch (error: Throwable) {
                synchronized(lock) {
                    pendingEvents.addFirst(event)
                    isDelivering = false
                }
                throw error
            }
        }
    }
}
