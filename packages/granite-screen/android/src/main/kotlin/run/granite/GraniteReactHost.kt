package run.granite

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext

/**
 * Host interface for integrating React Native into activities. This interface allows you to "host"
 * React Native components in any Activity, regardless of your existing inheritance hierarchy.
 *
 * The GraniteReactHost pattern provides maximum flexibility for integrating React Native into
 * existing Android applications with their own BaseActivity implementations.
 *
 * Usage example:
 * ```kotlin
 * class MyActivity : CompanyBaseActivity(), GraniteReactHost {
 *     override val graniteDelegate = GraniteActivityDelegateImpl()
 *
 *     override fun onCreate(savedInstanceState: Bundle?) {
 *         super.onCreate(savedInstanceState)
 *         setupHost(savedInstanceState)  // Automatically manages all lifecycle events
 *     }
 *
 *     override fun getReactPackages() = PackageList(this).packages
 *     override fun getGraniteModules(context: ReactContext) = listOf(MyModule())
 * }
 * ```
 */
interface GraniteReactHost {
    /** The delegate that handles all GraniteModule logic */
    val graniteDelegate: GraniteReactDelegate

    /** Initialize the React Native host. Call this in your activity's onCreate() method. */
    fun AppCompatActivity.setupHost(
        savedInstanceState: Bundle?,
        initialProps: Bundle,
    ) {
        // Configure delegate with providers
        graniteDelegate.setReactPackagesProvider { getReactPackages() }
        graniteDelegate.setBundleLoaderProvider { createBundleLoader() }
        graniteDelegate.setLoadingViewProvider { activity -> createLoadingView() }
        graniteDelegate.setErrorViewProvider { activity, error -> createErrorView(error) }

        // Initialize
        graniteDelegate.onCreate(this, savedInstanceState, initialProps)
    }

    /** Resume the React Native host. Call this in your activity's onResume() method. */
    fun AppCompatActivity.resumeHost() {
        graniteDelegate.onResume(this)
    }

    /** Pause the React Native host. Call this in your activity's onPause() method. */
    fun AppCompatActivity.pauseHost() {
        graniteDelegate.onPause(this)
    }

    /** Destroy the React Native host. Call this in your activity's onDestroy() method. */
    fun AppCompatActivity.destroyHost() {
        graniteDelegate.onDestroy(this)
    }

    // Abstract methods to be implemented by the activity

    /**
     * Get React packages including core packages and custom modules. Typically returns
     * PackageList(this).packages
     */
    fun getReactPackages(): List<ReactPackage>

    /**
     * Provide a BundleLoader implementation. This is now required and must return a valid loader
     * that supplies the component (module) name via BundleSource.
     */
    fun createBundleLoader(): BundleLoader

    /**
     * Create a custom loading view displayed while bundle is loading. Optional - defaults to
     * DefaultLoadingView.
     */
    fun createLoadingView(): View = DefaultLoadingView(this as AppCompatActivity)

    /**
     * Create a custom error view displayed when bundle loading fails. Optional - defaults to
     * DefaultErrorView.
     */
    fun createErrorView(error: Throwable): View = DefaultErrorView(this as AppCompatActivity, error)

    /**
     * Called when ReactContext is initialized and ready. Override this method to perform actions
     * that require ReactContext, such as registering Brick modules.
     *
     * @param context The initialized ReactContext
     */
    fun onReactContextInitialized(context: ReactContext) {
        // Default implementation does nothing
        // Override in your activity to register modules or perform other initialization
    }

    // Convenience accessors

    /** Get the current bundle loader if any. */
    fun getBundleLoader(): BundleLoader? = graniteDelegate.getBundleLoader()

    /** Get the ReactHost for advanced use cases. */
    fun getReactHost(): ReactHost? = graniteDelegate.getReactHost()

    /** Check if the React Native host is ready (ReactHost and surface initialized). */
    fun isHostReady(): Boolean = graniteDelegate.isReady()
}
