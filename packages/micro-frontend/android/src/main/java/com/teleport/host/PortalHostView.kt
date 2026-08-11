package com.teleport.host

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.facebook.react.views.view.ReactViewGroup
import com.teleport.global.PortalRegistry

/**
 * Native-owned destination for children moved out of a [com.teleport.portal.PortalView].
 *
 * A named host registers while attached to a Window. The matching source view keeps React/Fabric
 * ownership of its children and only reparents their Android views into this container.
 */
class PortalHostView(
  context: Context?,
) : ReactViewGroup(context) {
  private var name: String? = null
  private var isInBatch = false
  private var batchBaseIndex = 0
  private var hasPendingCleanup = false

  fun setName(newName: String?) {
    if (name == newName) return

    hasPendingCleanup = false
    name?.let { PortalRegistry.unregisterHost(it, this) }
    name = newName
    newName?.let { PortalRegistry.registerHost(it, this) }
  }

  fun cleanup() {
    if (isAttachedToWindow) {
      hasPendingCleanup = true
      return
    }

    cleanupNow()
  }

  /**
   * Returns the index at which a portal child should be inserted.
   *
   * Within a single Fabric commit all mutations run synchronously on the main
   * thread.  The first call in a commit records the current child count as
   * the "base"; subsequent calls in the same commit reuse that base so that
   * bottom-to-top Fabric ordering is compensated by [addView] at a specific index.
   * A [Handler.post] resets the flag after the commit finishes.
   */
  fun nextInsertionIndexForChildAt(childIndex: Int): Int {
    if (!isInBatch) {
      isInBatch = true
      batchBaseIndex = childCount
      Handler(Looper.getMainLooper()).post { isInBatch = false }
    }
    return minOf(batchBaseIndex + childIndex, childCount)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    // A host can be named before its Activity installs it into the Window.
    // Register again on attach so detached controller surfaces resolve the
    // currently visible Activity host deterministically.
    name?.let { PortalRegistry.registerHost(it, this) }
  }

  override fun onLayout(
    changed: Boolean,
    left: Int,
    top: Int,
    right: Int,
    bottom: Int,
  ) {
    super.onLayout(changed, left, top, right, bottom)
    name?.let { PortalRegistry.notifyHostLayoutChanged(it) }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()

    if (hasPendingCleanup) {
      cleanupNow()
    } else {
      // Keep the name so a temporary detach can register again on attach, but
      // stop routing children into a host that is no longer visible.
      name?.let { PortalRegistry.unregisterHost(it, this) }
    }
  }

  private fun cleanupNow() {
    name?.let { PortalRegistry.unregisterHost(it, this) }
    name = null
    isInBatch = false
    batchBaseIndex = 0
    hasPendingCleanup = false
  }
}
