@file:OptIn(com.facebook.react.common.annotations.UnstableReactNativeAPI::class)

package com.teleport.initialcontent

import android.content.Context
import android.view.View
import com.facebook.react.R
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.views.view.ReactViewGroup
import java.util.Collections
import java.util.WeakHashMap

/** Internal Fabric marker. A mount acknowledgment belongs to this native instance and identity. */
internal class PortalInitialContentView(context: Context) : ReactViewGroup(context), UIManagerListener {
  private var uiManager: UIManager? = null
  private var completedIdentity: String? = null
  private var mountGeneration = 0L
  private var completedGeneration = -1L

  init {
    PortalInitialContentRegistry.markers.add(this)
  }

  fun bind(manager: UIManager?) {
    if (uiManager === manager) return
    uiManager?.removeUIManagerEventListener(this)
    uiManager = manager
    manager?.addUIManagerEventListener(this)
  }

  fun invalidateMount() {
    mountGeneration++
    completedIdentity = null
  }

  fun hasCompletedMount(): Boolean = completedIdentity != null &&
    completedGeneration == mountGeneration && completedIdentity == getTag(R.id.view_tag_native_id)

  override fun willMountItems(uiManager: UIManager) = invalidateMount()

  override fun didMountItems(uiManager: UIManager) {
    // Preallocated views and deferred surface mount items have no parent yet. They cannot
    // acknowledge a transaction merely because another surface completed a mount batch.
    if (parent != null) {
      completedIdentity = getTag(R.id.view_tag_native_id) as? String
      completedGeneration = mountGeneration
      PortalInitialContentRegistry.changed()
    }
  }

  override fun willDispatchViewUpdates(uiManager: UIManager) = Unit
  override fun didDispatchMountItems(uiManager: UIManager) = Unit
  override fun didScheduleMountItems(uiManager: UIManager) = Unit

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    PortalInitialContentRegistry.changed()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    PortalInitialContentRegistry.changed()
  }

  fun dispose() {
    bind(null)
    invalidateMount()
    PortalInitialContentRegistry.markers.remove(this)
    PortalInitialContentRegistry.changed()
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
