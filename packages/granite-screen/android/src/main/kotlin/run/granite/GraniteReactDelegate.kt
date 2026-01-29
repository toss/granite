package run.granite

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactHost
import com.facebook.react.ReactPackage
import com.facebook.react.runtime.ReactSurfaceView

/**
 * Delegate interface for Granite functionality. This allows integration with existing BaseActivity
 * implementations.
 */
interface GraniteReactDelegate {
    // Lifecycle methods
    fun onCreate(
        activity: AppCompatActivity,
        savedInstanceState: Bundle?,
        initialProps: Bundle,
    )

    fun onResume(activity: AppCompatActivity)

    fun onPause(activity: AppCompatActivity)

    fun onDestroy(activity: AppCompatActivity)

    // Configuration methods - these should be provided by the activity
    fun setReactPackagesProvider(provider: () -> List<ReactPackage>)

    fun setBundleLoaderProvider(provider: () -> BundleLoader)

    // View creation methods - optional customization
    fun setLoadingViewProvider(provider: (AppCompatActivity) -> View)

    fun setErrorViewProvider(provider: (AppCompatActivity, Throwable) -> View)

    fun setReactContainerProvider(provider: (AppCompatActivity) -> android.view.ViewGroup?)

    // Consumer methods - for advanced view control

    /**
     * Set a consumer that will be called when loading starts.
     * If not set, default loading view behavior is used.
     */
    fun setLoadingViewConsumer(consumer: () -> Unit)

    /**
     * Set a consumer that will receive the ReactSurface view when ready.
     * Activity is responsible for adding this view to its layout.
     * If not set, delegate will call setContentView() directly (fallback).
     */
    fun setSurfaceViewConsumer(consumer: (ReactSurfaceView) -> Unit)

    /**
     * Set a consumer that will be called when bundle loading fails.
     * If not set, default error view behavior is used.
     */
    fun setErrorViewConsumer(consumer: (Throwable) -> Unit)

    /**
     * Start the ReactSurface. Call this after setting up the surface view in your layout.
     * This triggers surface.start() and applies pending lifecycle states.
     */
    fun startReactSurface()

    // Access methods
    fun getReactHost(): ReactHost?

    fun getBundleLoader(): BundleLoader?

    fun isReady(): Boolean

    // Surface management
    fun getContentView(): View?
}
