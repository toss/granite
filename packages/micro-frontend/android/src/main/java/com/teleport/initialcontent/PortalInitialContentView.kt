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
  private var requestKey: String? = null
  private var revision: Int = 0
  private var completedRequestKey: String? = null
  private var completedRevision: Int = 0
  private var completedSurfaceId = -1
  // Fabric child membership survives native clipping; a physical parent check would not.
  private var sentinel: WeakReference<View>? = null

  fun setInitialContentKey(value: String?) {
    if (requestKey == value) return
    invalidateMount()
    requestKey = value
  }

  fun setInitialContentRevision(value: Int) {
    if (revision == value) return
    invalidateMount()
    revision = value
  }

  fun matchesIdentity(key: String, revision: Int) = requestKey == key && this.revision == revision

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
    completedRequestKey = null
  }

  fun completeMount(transaction: PortalInitialContentMounts.Transaction) {
    if (pendingTransaction != transaction || !hasMountSentinel() || requestKey.isNullOrEmpty() || revision < 0) return
    pendingTransaction = null
    completedTransaction = transaction
    completedRequestKey = requestKey
    completedRevision = revision
    completedSurfaceId = UIManagerHelper.getSurfaceId(this)
  }

  fun hasCompletedMount(): Boolean =
    !PortalInitialContentMounts.isExecuting && hasMountSentinel() && completedTransaction != null &&
    completedRequestKey != null && completedRequestKey == requestKey && completedRevision == revision &&
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
