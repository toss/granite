package run.granite.microfrontend

import com.facebook.common.logging.FLog

internal interface GraniteMicroFrontendRuntimeEventTarget {
    /**
     * Hands [event] to the runtime. Returning `true` means the target accepted the event, not that
     * delivery happened: the target must invoke [onDelivered] once it has handed the event to the
     * runtime's event emitter. An accepted event that is never acknowledged stays queued and is
     * redelivered to the next runtime.
     *
     * [onDelivered] does not prove that JavaScript observed the event. The emitter dispatches to
     * whatever listeners are registered at that moment and schedules each one on a later tick, so
     * an event acknowledged while nothing is subscribed is dropped from the queue without anyone
     * seeing it. The queue covers the gap between runtimes, not the gap between a live runtime and
     * a subscribed listener.
     */
    fun emit(event: GraniteMicroFrontendEvent, onDelivered: () -> Unit): Boolean
}

internal class GraniteMicroFrontendRuntimeEventRouter {
    private val lock = Any()
    private val pendingEvents = ArrayDeque<GraniteMicroFrontendEvent>()
    private val attachedTargets = mutableSetOf<GraniteMicroFrontendRuntimeEventTarget>()
    private var activeTarget: GraniteMicroFrontendRuntimeEventTarget? = null
    private var isDelivering = false
    private var inFlight: Delivery? = null
    private var didLoseActiveTarget = false

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
            if (didLoseActiveTarget) {
                didLoseActiveTarget = false
                FLog.w(
                    TAG,
                    "Runtime replaced while %d event(s) were pending; session state is redelivered from the queue",
                    pendingEvents.size,
                )
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
            if (pendingEvents.size >= MAX_PENDING_EVENTS) {
                FLog.w(
                    TAG,
                    "Dropping %s: %d event(s) already pending with no runtime consuming them",
                    event::class.java.simpleName,
                    pendingEvents.size,
                )
                return
            }
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
                didLoseActiveTarget = true
            }
            val delivery = inFlight
            if (delivery != null && delivery.target === target && !delivery.isLoopOwned) {
                inFlight = null
                isDelivering = false
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
            val delivery = synchronized(lock) {
                val target = activeTarget
                if (target == null || pendingEvents.isEmpty()) {
                    isDelivering = false
                    inFlight = null
                    return
                }
                Delivery(target, pendingEvents.first()).also { inFlight = it }
            }
            val accepted = try {
                delivery.target.emit(delivery.event) { acknowledge(delivery) }
            } catch (error: Throwable) {
                val shouldResumeWithReplacement = synchronized(lock) {
                    delivery.isLoopOwned = false
                    inFlight = null
                    isDelivering = false
                    activeTarget != null && activeTarget !== delivery.target && startDrainIfNeeded()
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
            synchronized(lock) {
                delivery.isLoopOwned = false
                if (!accepted) {
                    inFlight = null
                    isDelivering = false
                    val shouldResumeWithReplacement =
                        activeTarget != null && activeTarget !== delivery.target && startDrainIfNeeded()
                    if (!shouldResumeWithReplacement) {
                        return
                    }
                } else if (!delivery.isAcknowledged) {
                    // Delivery is in flight. acknowledge() resumes the drain once it completes.
                    return
                } else {
                    inFlight = null
                }
            }
        }
    }

    private fun acknowledge(delivery: Delivery) {
        val shouldDrain = synchronized(lock) {
            if (delivery.isAcknowledged) {
                return
            }
            delivery.isAcknowledged = true
            if (pendingEvents.firstOrNull() === delivery.event) {
                pendingEvents.removeFirst()
            }
            if (delivery.isLoopOwned) {
                return
            }
            inFlight = null
            isDelivering = false
            activeTarget != null && startDrainIfNeeded()
        }
        if (shouldDrain) {
            drain()
        }
    }

    private class Delivery(
        val target: GraniteMicroFrontendRuntimeEventTarget,
        val event: GraniteMicroFrontendEvent,
    ) {
        var isLoopOwned = true
        var isAcknowledged = false
    }

    internal companion object {
        private const val TAG = "GraniteMicroFrontendRuntime"
        internal const val MAX_PENDING_EVENTS = 64
    }
}
