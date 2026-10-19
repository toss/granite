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
  private var hasExplicitIdentity = false
  private var completedRequestKey: String? = null
  private var completedRevision: Int = 0
  private var completedLegacyNativeId: String? = null
  private var completedSurfaceId = -1
  // Fabric child membership survives native clipping; a physical parent check would not.
  private var sentinel: WeakReference<View>? = null

  fun setInitialContentKey(value: String?) {
    if (hasExplicitIdentity && requestKey == value) return
    hasExplicitIdentity = true
    invalidateMount()
    requestKey = value
  }

  fun setInitialContentRevision(value: Int) {
    if (hasExplicitIdentity && revision == value) return
    hasExplicitIdentity = true
    invalidateMount()
    revision = value
  }

  fun matchesIdentity(key: String, revision: Int, acceptLegacyNativeId: Boolean = false): Boolean =
    if (hasExplicitIdentity) requestKey == key && this.revision == revision
    else acceptLegacyNativeId && revision == 0 && legacyNativeId() == LEGACY_MARKER_PREFIX + key

  fun invalidateLegacyIdentity() {
    if (!hasExplicitIdentity) invalidateMount()
  }

  private fun legacyNativeId(): String? =
    (getTag(R.id.view_tag_native_id) as? String)?.takeIf {
      !hasExplicitIdentity && it.startsWith(LEGACY_MARKER_PREFIX) && it.length > LEGACY_MARKER_PREFIX.length
    }

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
    completedLegacyNativeId = null
  }

  fun completeMount(transaction: PortalInitialContentMounts.Transaction) {
    val legacyId = legacyNativeId()
    if (pendingTransaction != transaction || !hasMountSentinel()) return
    if ((requestKey.isNullOrEmpty() || revision < 0) && legacyId == null) return
    pendingTransaction = null
    completedTransaction = transaction
    completedRequestKey = requestKey
    completedRevision = revision
    completedLegacyNativeId = legacyId
    completedSurfaceId = UIManagerHelper.getSurfaceId(this)
  }

  fun hasCompletedMount(acceptLegacyNativeId: Boolean = false): Boolean =
    !PortalInitialContentMounts.isExecuting && hasMountSentinel() && completedTransaction != null &&
    (if (completedLegacyNativeId != null) {
      acceptLegacyNativeId && completedLegacyNativeId == legacyNativeId()
    } else {
      completedRequestKey != null && completedRequestKey == requestKey && completedRevision == revision
    }) &&
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
    private const val LEGACY_MARKER_PREFIX = "granite:portal-initial-content:0:"
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
