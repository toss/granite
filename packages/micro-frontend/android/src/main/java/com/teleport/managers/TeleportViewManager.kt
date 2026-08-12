package com.teleport.managers

import com.facebook.react.uimanager.PointerEvents
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.view.ReactViewGroup

// Portal views are renderer plumbing, not styleable <View>s: their props come from the codegen
// specs, so extending ReactViewManager would only advertise view props this manager never applies.
abstract class TeleportViewManager : SimpleViewManager<ReactViewGroup>() {
  protected abstract fun createTeleportView(context: ThemedReactContext): ReactViewGroup

  fun forceBoxNone(view: ReactViewGroup) {
    view.pointerEvents = PointerEvents.BOX_NONE
  }

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup =
    createTeleportView(context).also {
      forceBoxNone(it)
    }
}
