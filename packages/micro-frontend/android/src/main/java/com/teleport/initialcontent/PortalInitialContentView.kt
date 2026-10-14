package com.teleport.initialcontent

import android.content.Context
import android.view.View
import com.facebook.react.R
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.view.ReactViewGroup
import java.lang.ref.WeakReference
import java.util.Collections
import java.util.WeakHashMap

/** Internal Fabric marker. Completion belongs to a native instance, surface, identity and mount. */
internal class PortalInitialContentView(context: Context) : ReactViewGroup(context) {
  internal var pendingTransaction: PortalInitialContentMounts.Transaction? = null
  private var completedTransaction: PortalInitialContentMounts.Transaction? = null
  private var completedIdentity: String? = null
  private var completedSurfaceId = -1
  // Fabric child membership survives native clipping; a physical parent check would not.
  private var sentinel: WeakReference<View>? = null

  fun setMountSentinel(view: View?) {
    invalidateMount()
    sentinel = view?.let { WeakReference(it) }
  }

  fun isMountSentinel(view: View?): Boolean = view != null && sentinel?.get() === view

  private fun hasMountSentinel(): Boolean = sentinel?.get()?.getTag(R.id.view_tag_native_id) == SENTINEL_ID

  init {
    PortalInitialContentRegistry.markers.add(this)
  }

  fun invalidateMount() {
    pendingTransaction = null
    completedTransaction = null
    completedIdentity = null
  }

  fun completeMount(transaction: PortalInitialContentMounts.Transaction) {
    if (pendingTransaction != transaction || !hasMountSentinel()) return
    pendingTransaction = null
    completedTransaction = transaction
    completedIdentity = getTag(R.id.view_tag_native_id) as? String
    completedSurfaceId = UIManagerHelper.getSurfaceId(this)
  }

  fun hasCompletedMount(): Boolean =
    !PortalInitialContentMounts.isExecuting && hasMountSentinel() && completedTransaction != null &&
    completedIdentity != null && completedIdentity == getTag(R.id.view_tag_native_id) &&
    completedSurfaceId == UIManagerHelper.getSurfaceId(this)

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    PortalInitialContentRegistry.changed()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    PortalInitialContentRegistry.changed()
  }

  fun dispose() {
    setMountSentinel(null)
    PortalInitialContentRegistry.markers.remove(this)
    PortalInitialContentRegistry.changed()
  }

  companion object {
    const val SENTINEL_ID = "granite:portal-mount-sentinel"
  }
}

internal object PortalInitialContentRegistry {
  val markers: MutableSet<PortalInitialContentView> = Collections.newSetFromMap(WeakHashMap())
  val observers = mutableSetOf<() -> Unit>()

  fun changed() = observers.toList().forEach { it() }

  fun isInHost(marker: View, host: View): Boolean {
    if (!host.isAttachedToWindow || !marker.isAttachedToWindow || marker.windowToken != host.windowToken) return false
    var current = marker.parent
    while (current is View) {
      if (current === host) return true
      current = current.parent
    }
    return false
  }
}
