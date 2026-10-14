package com.teleport.initialcontent

import android.os.Looper
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import java.util.Collections
import java.util.WeakHashMap

/** Actual IntBufferBatchMountItem execution boundaries, including deferred surface mounts. */
internal object PortalInitialContentMounts : ReactMarker.FabricMarkerListener {
  data class Transaction(val commitNumber: Int, val epoch: Long)

  private var epoch = 0L
  private var active: Transaction? = null
  private val mutated: MutableSet<PortalInitialContentView> = Collections.newSetFromMap(WeakHashMap())
  val isExecuting: Boolean get() = active != null

  fun install() = ReactMarker.addFabricListener(this)

  fun recordMutation(view: PortalInitialContentView) {
    val transaction = active ?: return // Preallocation/sync props are not a mounted commit.
    view.invalidateMount()
    view.pendingTransaction = transaction
    mutated.add(view)
  }

  override fun logFabricMarker(name: ReactMarkerConstants, tag: String?, instanceKey: Int, timestamp: Long) {
    if (Looper.myLooper() != Looper.getMainLooper()) return
    when (name) {
      ReactMarkerConstants.FABRIC_BATCH_EXECUTION_START -> {
        // A missing END means execution failed. Its pending mutations cannot be acknowledged
        // by a later, unrelated batch, even when commit numbers repeat on another surface.
        mutated.forEach { it.invalidateMount() }
        mutated.clear()
        active = Transaction(instanceKey, ++epoch)
      }
      ReactMarkerConstants.FABRIC_BATCH_EXECUTION_END -> {
        val transaction = active ?: return
        if (transaction.commitNumber != instanceKey) return
        active = null
        mutated.toList().forEach { it.completeMount(transaction) }
        mutated.clear()
        PortalInitialContentRegistry.changed()
      }
      else -> Unit
    }
  }
}
