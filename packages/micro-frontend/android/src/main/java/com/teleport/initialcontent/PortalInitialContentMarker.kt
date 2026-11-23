package com.teleport.initialcontent

import android.view.View

/**
 * Tells whether a view is the native view that the JS `PortalInitialContentView` component renders.
 *
 * A host that walks a Portal view tree to find the content a session drew can use this to skip the markers. Use it
 * instead of checking the native view class.
 */
object PortalInitialContentMarker {
  @JvmStatic
  fun isMarker(view: View?): Boolean = view is PortalInitialContentView
}
