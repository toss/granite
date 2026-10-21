package teleport.example;

import android.content.Context;
import android.graphics.Point;
import android.graphics.Rect;
import android.view.View;
import androidx.annotation.NonNull;
import androidx.annotation.UiThread;
import com.facebook.react.interfaces.fabric.ReactSurface;
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags;
import com.facebook.react.modules.i18nmanager.I18nUtil;
import com.facebook.react.modules.systeminfo.ReactNativeVersion;
import com.facebook.react.runtime.ReactSurfaceImpl;
import com.facebook.react.uimanager.RootViewUtil;
import java.util.Map;

/**
 * Sizes the detached controller surface to the React root view that hosts its portals and gives it
 * that root view's viewport offset, which {@code measureInWindow()} and
 * {@code getBoundingClientRect()} add to teleported views. React Native computes this offset only
 * for a surface whose view is attached to a window, so a detached surface otherwise stays at
 * (0, 0). A root view created with {@code measuresPortalsInRootView = true} needs this.
 *
 * <p>React Native has no public way to set this on a bridgeless surface:
 * {@code FabricUIManager.updateRootLayoutSpecs} does nothing for it and
 * {@code ReactSurfaceImpl.updateLayoutSpecs} is internal. This is Java because it calls the
 * surface handler that {@code ReactSurfaceImpl} exposes to Java, with the RTL, density and font
 * scale arguments {@code updateLayoutSpecs} passes and the offset {@code ReactSurfaceView}
 * computes in the running React Native version. Recheck both against each React Native upgrade.
 */
public final class ControllerSurfaceViewport {
  private ControllerSurfaceViewport() {}

  /**
   * Call on the UI thread with the {@code PortalReactRootView} of the active host after it is laid
   * out, and again when its size, window position or insets change. Only for a detached surface
   * whose view is never attached or measured; an attached surface's constraints belong to React
   * Native.
   *
   * @return {@code false} if the surface is not a {@code ReactSurfaceImpl} or the root view has no
   *     size yet
   */
  @UiThread
  public static boolean update(@NonNull ReactSurface surface, @NonNull View rootView) {
    int width = rootView.getWidth();
    int height = rootView.getHeight();
    if (!(surface instanceof ReactSurfaceImpl) || width <= 0 || height <= 0) {
      return false;
    }
    ReactSurfaceImpl surfaceImpl = (ReactSurfaceImpl) surface;
    Context context = surfaceImpl.getContext();
    Point offset = viewportOffset(rootView);
    I18nUtil i18nUtil = I18nUtil.getInstance();
    float fontScale =
        ReactNativeFeatureFlags.enableFontScaleChangesUpdatingLayout()
            ? context.getResources().getConfiguration().fontScale
            : 1f;
    synchronized (surfaceImpl) {
      surfaceImpl
          .getSurfaceHandler()
          .setLayoutConstraints(
              View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
              View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY),
              offset.x,
              offset.y,
              i18nUtil.doLeftAndRightSwapInRTL(context),
              i18nUtil.isRTL(context),
              context.getResources().getDisplayMetrics().density,
              fontScale);
    }
    return true;
  }

  // The offset ReactSurfaceView computes for itself. From 0.86 that is RootViewUtil's formula.
  // Up to 0.85 it is the screen location minus the visible frame, while RootViewUtil used the
  // window location and was off by the window position in freeform windows.
  private static Point viewportOffset(View rootView) {
    Map<String, ?> version = ReactNativeVersion.VERSION;
    Object major = version.get("major");
    Object minor = version.get("minor");
    if (major instanceof Number
        && minor instanceof Number
        && (((Number) major).intValue() > 0 || ((Number) minor).intValue() >= 86)) {
      return RootViewUtil.getViewportOffset(rootView);
    }
    int[] location = new int[2];
    rootView.getLocationOnScreen(location);
    Rect visibleFrame = new Rect();
    rootView.getWindowVisibleDisplayFrame(visibleFrame);
    return new Point(location[0] - visibleFrame.left, location[1] - visibleFrame.top);
  }
}
