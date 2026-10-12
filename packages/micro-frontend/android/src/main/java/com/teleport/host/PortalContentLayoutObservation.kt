package com.teleport.host

import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import com.facebook.react.R
import com.facebook.react.bridge.UiThreadUtil
import java.util.ArrayDeque

internal class PortalContentLayoutObservation(
  host: PortalHostView,
  requestKey: String,
  revision: Int,
  onReady: () -> Unit,
) : AutoCloseable, ViewTreeObserver.OnPreDrawListener {
  private var host: PortalHostView? = host
  private var onReady: (() -> Unit)? = onReady
  private var observer: ViewTreeObserver? = null
  private val nativeId = "granite:portal-initial-content:$revision:$requestKey"

  fun attach() {
    val currentHost = host ?: return
    if (observer == null && currentHost.isAttachedToWindow) {
      observer = currentHost.viewTreeObserver.also { it.addOnPreDrawListener(this) }
      // A late subscriber may observe an idle tree with no other traversal scheduled.
      currentHost.postInvalidateOnAnimation()
    }
  }

  override fun onPreDraw(): Boolean {
    val currentHost = host ?: return true
    val marker = findUniqueMarker(currentHost) ?: return true
    if (hasLayoutInHost(marker, currentHost)) {
      val callback = onReady
      close()
      callback?.invoke()
    }
    return true
  }

  override fun close() {
    UiThreadUtil.assertOnUiThread()
    observer?.takeIf { it.isAlive }?.removeOnPreDrawListener(this)
    observer = null
    onReady = null
    val previousHost = host
    host = null
    previousHost?.removeContentLayoutObservation(this)
  }

  private fun findUniqueMarker(host: PortalHostView): View? {
    var match: View? = null
    val groups = ArrayDeque<ViewGroup>()
    groups.add(host)
    while (groups.isNotEmpty()) {
      val group = groups.removeLast()
      for (index in 0 until group.childCount) {
        val child = group.getChildAt(index) ?: continue
        // PortalView can expose logical children that physically belong to a different host.
        if (child.parent !== group) continue
        if (child.getTag(R.id.view_tag_native_id) == nativeId) {
          if (match != null) return null
          match = child
        }
        if (child is ViewGroup) groups.add(child)
      }
    }
    return match
  }

  private fun hasLayoutInHost(marker: View, host: PortalHostView): Boolean {
    val windowToken = host.windowToken ?: return false
    if (host.width <= 0 || host.height <= 0 || marker.width <= 0 || marker.height <= 0) return false
    var current: View = marker
    while (true) {
      if (!current.isAttachedToWindow || current.windowToken != windowToken || current.isLayoutRequested) return false
      if (current === host) return true
      current = current.parent as? View ?: return false
    }
  }
}
