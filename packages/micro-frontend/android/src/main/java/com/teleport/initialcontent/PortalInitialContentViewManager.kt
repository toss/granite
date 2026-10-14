package com.teleport.initialcontent

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.viewmanagers.GranitePortalInitialContentViewManagerDelegate
import com.facebook.react.viewmanagers.GranitePortalInitialContentViewManagerInterface
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

@ReactModule(name = PortalInitialContentViewManager.NAME)
class PortalInitialContentViewManager : ReactViewManager(), GranitePortalInitialContentViewManagerInterface<ReactViewGroup> {
  private val delegate = GranitePortalInitialContentViewManagerDelegate(this)
  override fun getName() = NAME
  override fun getDelegate(): ViewManagerDelegate<ReactViewGroup> = delegate

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup =
    PortalInitialContentView(context).also { it.bind(UIManagerHelper.getUIManager(context, UIManagerType.FABRIC)) }

  override fun onAfterUpdateTransaction(view: ReactViewGroup) {
    super.onAfterUpdateTransaction(view)
    (view as PortalInitialContentView).invalidateMount()
  }

  // A recycled marker must never inherit a previous session's acknowledgment or listener.
  override fun prepareToRecycleView(reactContext: ThemedReactContext, view: ReactViewGroup): ReactViewGroup? = null

  override fun onDropViewInstance(view: ReactViewGroup) {
    (view as PortalInitialContentView).dispose()
    super.onDropViewInstance(view)
  }

  companion object {
    const val NAME = "GranitePortalInitialContentView"
  }
}
