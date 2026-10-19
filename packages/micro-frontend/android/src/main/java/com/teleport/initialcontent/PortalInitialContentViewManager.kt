package com.teleport.initialcontent

import android.view.View
import com.facebook.react.R
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

@ReactModule(name = PortalInitialContentViewManager.NAME)
class PortalInitialContentViewManager : ReactViewManager() {
  // Use the ordinary View property dispatcher: the generated base delegate omits
  // ReactViewManager props such as pointerEvents, accessible and removeClippedSubviews.
  override fun getName() = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup =
    PortalInitialContentView(context)

  @ReactProp(name = "nativeID")
  override fun setNativeId(view: ReactViewGroup, nativeId: String?) {
    if (view.getTag(R.id.view_tag_native_id) != nativeId) {
      (view as PortalInitialContentView).invalidateLegacyIdentity()
    }
    super.setNativeId(view, nativeId)
  }

  @ReactProp(name = "initialContentKey")
  fun setInitialContentKey(view: ReactViewGroup, value: String?) {
    (view as PortalInitialContentView).setInitialContentKey(value)
  }

  @ReactProp(name = "initialContentRevision", defaultInt = 0)
  fun setInitialContentRevision(view: ReactViewGroup, value: Int) {
    (view as PortalInitialContentView).setInitialContentRevision(value)
  }

  override fun onAfterUpdateTransaction(view: ReactViewGroup) {
    super.onAfterUpdateTransaction(view)
    PortalInitialContentMounts.recordMutation(view as PortalInitialContentView)
  }

  override fun addView(parent: ReactViewGroup, child: View, index: Int) {
    val marker = parent as PortalInitialContentView
    if (child.getTag(R.id.view_tag_native_id) == PortalInitialContentView.SENTINEL_ID) {
      marker.setMountSentinel(child)
    }
    PortalInitialContentMounts.recordMutation(marker)
    super.addView(parent, child, index)
  }

  override fun removeViewAt(parent: ReactViewGroup, index: Int) {
    val marker = parent as PortalInitialContentView
    if (marker.isMountSentinel(getChildAt(parent, index))) marker.setMountSentinel(null)
    PortalInitialContentMounts.recordMutation(marker)
    super.removeViewAt(parent, index)
  }

  // A recycled marker must never inherit a previous session's acknowledgment or transaction.
  override fun prepareToRecycleView(reactContext: ThemedReactContext, view: ReactViewGroup): ReactViewGroup? = null

  override fun onDropViewInstance(view: ReactViewGroup) {
    (view as PortalInitialContentView).dispose()
    super.onDropViewInstance(view)
  }

  companion object {
    const val NAME = "GranitePortalInitialContentView"
  }
}
