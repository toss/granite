package com.teleport.host

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.UiThreadUtil
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
  private val contentLayoutObservations = mutableSetOf<PortalContentLayoutObservation>()

  /**
   * Observes an explicit initial-content marker in this host without delaying drawing.
   *
   * Call and close on the UI thread. A subscription fires once for one unambiguous matching
   * native View attached to this Window with positive bounds and no pending layout in its path.
   * Reparenting can clear `isLaidOut` while preserving RN-managed bounds, so that flag is not used.
   * This does not acknowledge a Fabric commit or completion of pixels, images, or network loading.
   *
   * Subscribe before or after attachment. Detach, rename, cleanup, and a size change after nonzero
   * bounds cancel pending observations. Subscribe again with a new revision for resized content.
   */
  fun observeContentLayout(
    requestKey: String,
    revision: Int,
    onReady: () -> Unit,
  ): AutoCloseable {
    UiThreadUtil.assertOnUiThread()
    require(requestKey.isNotEmpty()) { "requestKey must not be empty" }
    require(revision >= 0) { "revision must be nonnegative" }
    return PortalContentLayoutObservation(this, requestKey, revision, onReady).also {
      contentLayoutObservations.add(it)
      it.attach()
    }
  }

  internal fun removeContentLayoutObservation(observation: PortalContentLayoutObservation) {
    contentLayoutObservations.remove(observation)
  }

  private fun cancelContentLayoutObservations() {
    contentLayoutObservations.toList().forEach { it.close() }
  }

  fun setName(newName: String?) {
    if (name == newName) return

    cancelContentLayoutObservations()

    hasPendingCleanup = false
    name?.let { PortalRegistry.unregisterHost(it, this) }
    name = newName
    newName?.let { PortalRegistry.registerHost(it, this) }
  }

  fun cleanup() {
    cancelContentLayoutObservations()
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
    contentLayoutObservations.toList().forEach { it.attach() }
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

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    if (oldw > 0 && oldh > 0 && (w != oldw || h != oldh)) {
      cancelContentLayoutObservations()
    }
  }

  override fun onDetachedFromWindow() {
    cancelContentLayoutObservations()
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
