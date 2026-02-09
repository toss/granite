package run.granite

import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.facebook.react.ReactHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.fabric.ComponentFactory
import com.facebook.react.interfaces.fabric.ReactSurface
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.react.runtime.ReactSurfaceView
import kotlinx.coroutines.launch
import java.lang.ref.WeakReference

/** Default implementation of GraniteReactDelegate. Manages ReactHost, ReactSurface */
@OptIn(UnstableReactNativeAPI::class)
class GraniteReactDelegateImpl : GraniteReactDelegate {
    // Lifecycle state enum to track pending state when ReactHost is null
    private enum class LifecycleState {
        BEFORE_CREATE,
        CREATED,
        RESUMED,
        PAUSED,
        DESTROYED,
    }

    private var reactHost: ReactHost? = null
    private var reactSurface: ReactSurface? = null
    private var currentBundleSource: BundleSource? = null
    private var currentBundleLoader: BundleLoader? = null
    private var contentView: View? = null
    private var componentFactory: ComponentFactory? = null
    private var reactInstanceEventListener: ReactInstanceEventListener? = null

    // Track pending lifecycle state for when ReactHost is created asynchronously
    private var pendingLifecycleState: LifecycleState = LifecycleState.BEFORE_CREATE

    // Use WeakReference to prevent Activity memory leak
    private var pendingActivityRef: WeakReference<AppCompatActivity>? = null
    private val pendingActivity: AppCompatActivity?
        get() = pendingActivityRef?.get()

    // Provider functions - to be set by the activity
    private var reactPackagesProvider: (() -> List<ReactPackage>)? = null
    private var bundleLoaderProvider: (() -> BundleLoader)? = null
    private var loadingViewProvider: ((AppCompatActivity) -> View)? = null
    private var errorViewProvider: ((AppCompatActivity, Throwable) -> View)? = null
    private var reactContainerProvider: ((AppCompatActivity) -> android.view.ViewGroup?)? = null

    // Consumer functions - for advanced view control
    private var loadingViewConsumer: (() -> Unit)? = null
    private var surfaceViewConsumer: ((ReactSurfaceView) -> Unit)? = null
    private var errorViewConsumer: ((Throwable) -> Unit)? = null

    override fun onCreate(
        activity: AppCompatActivity,
        savedInstanceState: Bundle?,
        initialProps: Bundle,
    ) {
        // Track lifecycle state
        pendingLifecycleState = LifecycleState.CREATED
        pendingActivityRef = WeakReference(activity)

        // Get packages
        val packages = reactPackagesProvider?.invoke() ?: emptyList()

        Log.d(TAG, "Using ${packages.size} React packages")
        packages.forEach { pkg ->
            Log.d(TAG, "- ${pkg.javaClass.simpleName}")
        }

        if (BuildConfig.DEBUG) {
            Log.d(TAG, "Running in debug mode")
        }

        // Require BundleLoader
        val bundleLoader =
            bundleLoaderProvider?.invoke()
                ?: throw IllegalStateException("BundleLoader provider not set")
        currentBundleLoader = bundleLoader

        // Show loading view and start bundle loading
        // Use consumer if set, otherwise use provider/default
        loadingViewConsumer?.invoke()
            ?: run {
                val loadingView =
                    loadingViewProvider?.invoke(activity) ?: DefaultLoadingView(activity)
                contentView = loadingView
                activity.setContentView(loadingView)
            }

        loadBundleWithLoader(activity, bundleLoader, initialProps)
    }

    override fun onResume(activity: AppCompatActivity) {
        // Track pending lifecycle state
        pendingLifecycleState = LifecycleState.RESUMED
        pendingActivityRef = WeakReference(activity)

        // Call onHostResume if ReactHost is ready, otherwise it will be called in setupReactHost
        val backBtnHandler = activity as? DefaultHardwareBackBtnHandler
            ?: throw IllegalStateException(
                "Activity ${activity.javaClass.simpleName} must implement DefaultHardwareBackBtnHandler",
            )
        reactHost?.onHostResume(activity, backBtnHandler)
            ?: Log.w(
                TAG,
                "ReactHost not ready yet, will call onHostResume after creation",
            )
    }

    override fun onPause(activity: AppCompatActivity) {
        // Track pending lifecycle state
        pendingLifecycleState = LifecycleState.PAUSED
        pendingActivityRef = WeakReference(activity)

        // Call onHostPause only if ReactHost exists
        reactHost?.onHostPause(activity)
            ?: Log.w(TAG, "ReactHost not ready, skipping onHostPause")
    }

    override fun onDestroy(activity: AppCompatActivity) {
        // Track pending lifecycle state
        pendingLifecycleState = LifecycleState.DESTROYED
        pendingActivityRef = null

        // Clean up ReactSurface
        // stop() is async (TaskInterface<Void>), but clear() and detach() can be called concurrently:
        // - clear() removes view children via UiThreadUtil.runOnUiThread (thread-safe)
        // - detach() releases host reference via AtomicReference.set(null) (thread-safe)
        reactSurface?.let { surface ->
            surface.stop()
            surface.clear()
            surface.detach()
        }
        reactSurface = null

        // Remove ReactInstanceEventListener
        reactInstanceEventListener?.let { listener ->
            reactHost?.removeReactInstanceEventListener(listener)
        }
        reactInstanceEventListener = null

        // Clean up ReactHost
        // invalidate() internally runs destroy() asynchronously on bgExecutor.
        // ReactHostImpl instance is kept alive by its own internal threading,
        // so nulling the delegate's reactHost field won't interrupt the async destroy.
        reactHost?.let { host ->
            host.onHostDestroy(activity)
            host.invalidate()
        }
            ?: Log.w(TAG, "ReactHost not ready, skipping onHostDestroy")
        reactHost = null

        // Clean up internal references
        contentView = null
        currentBundleSource = null
        currentBundleLoader = null
        componentFactory = null

        // Clean up Provider/Consumer lambdas (may capture Activity via closure)
        reactPackagesProvider = null
        bundleLoaderProvider = null
        loadingViewProvider = null
        errorViewProvider = null
        reactContainerProvider = null
        loadingViewConsumer = null
        surfaceViewConsumer = null
        errorViewConsumer = null
    }

    override fun setReactPackagesProvider(provider: () -> List<ReactPackage>) {
        this.reactPackagesProvider = provider
    }

    override fun setBundleLoaderProvider(provider: () -> BundleLoader) {
        this.bundleLoaderProvider = provider
    }

    override fun setLoadingViewProvider(provider: (AppCompatActivity) -> View) {
        this.loadingViewProvider = provider
    }

    override fun setErrorViewProvider(provider: (AppCompatActivity, Throwable) -> View) {
        this.errorViewProvider = provider
    }

    override fun setReactContainerProvider(provider: (AppCompatActivity) -> android.view.ViewGroup?) {
        this.reactContainerProvider = provider
    }

    override fun setLoadingViewConsumer(consumer: () -> Unit) {
        this.loadingViewConsumer = consumer
    }

    override fun setSurfaceViewConsumer(consumer: (ReactSurfaceView) -> Unit) {
        this.surfaceViewConsumer = consumer
    }

    override fun setErrorViewConsumer(consumer: (Throwable) -> Unit) {
        this.errorViewConsumer = consumer
    }

    override fun getReactHost(): ReactHost? = reactHost

    override fun getBundleLoader(): BundleLoader? = currentBundleLoader

    override fun isReady(): Boolean = reactHost != null && reactSurface != null

    override fun getContentView(): View? = contentView

    private fun getMainComponentName(): String =
        currentBundleSource?.componentName
            ?: throw IllegalStateException(
                "mainComponentName is missing. Use a BundleLoader that provides componentName.",
            )

    // Default (no-loader) ReactHost creation removed; BundleLoader is mandatory.

    private fun setupReactHost(
        activity: AppCompatActivity,
        initialProps: Bundle,
    ) {
        reactHost?.let { host ->
            // Get component name using the method
            val componentName = getMainComponentName()

            Log.d(TAG, "Using component name: $componentName")

            // Create surface
            val surface = host.createSurface(activity, componentName, initialProps)
            reactSurface = surface
            contentView = surface.view

            (surface.view as? ReactSurfaceView)?.let { surfaceView ->
                surfaceViewConsumer?.invoke(surfaceView)
                    ?: run {
                        // Fallback: Use default behavior if consumer not set
                        surfaceView.id = View.NO_ID
                        activity.setContentView(surfaceView)
                        setupWindowInsets(surfaceView)

                        // Start surface immediately if consumer not used
                        startReactSurface()
                    }
            }
        }
    }

    private fun setupWindowInsets(surfaceView: View) {
        val insetsType: Int =
            WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()

        val windowInsetsListener = { view: View, windowInsets: WindowInsetsCompat ->
            val insets = windowInsets.getInsets(insetsType)

            (view.layoutParams as? FrameLayout.LayoutParams)?.apply {
                setMargins(insets.left, insets.top, insets.right, insets.bottom)
            }

            WindowInsetsCompat.CONSUMED
        }
        ViewCompat.setOnApplyWindowInsetsListener(surfaceView, windowInsetsListener)
    }

    override fun startReactSurface() {
        reactHost?.let { host ->
            reactSurface?.let { surface ->
                Log.d(TAG, "Starting ReactSurface")

                // Add ReactInstanceEventListener
                val listener = object : ReactInstanceEventListener {
                    override fun onReactContextInitialized(context: ReactContext) {
                        Log.d(TAG, "Granite onReactContextInitialized called")
                        Log.d(
                            TAG,
                            "Granite onReactContextInitialized on currentActivity = ${context.currentActivity}",
                        )
                        // Call the host's onReactContextInitialized method
                        pendingActivity?.let { activity ->
                            if (activity is GraniteReactHost) {
                                Log.d(
                                    TAG,
                                    "Granite activity.onReactContextInitialized called",
                                )
                                activity.onReactContextInitialized(context)
                            }
                        }
                    }
                }
                reactInstanceEventListener = listener
                host.addReactInstanceEventListener(listener)

                // Start the surface
                Log.d(TAG, "About to call surface.start()")
                Log.d(TAG, "surface = $surface")
                Log.d(
                    TAG,
                    "If AppRegistry.registerComponent was not called, this will fail!",
                )
                surface.start()
                Log.d(TAG, "surface.start() completed")

                // Apply pending lifecycle state
                Log.d(
                    TAG,
                    "Applying pending lifecycle state: $pendingLifecycleState",
                )
                when (pendingLifecycleState) {
                    LifecycleState.RESUMED -> {
                        // Activity is resumed, call onHostResume
                        pendingActivity?.let { act ->
                            val handler = act as? DefaultHardwareBackBtnHandler
                                ?: throw IllegalStateException(
                                    "Activity ${act.javaClass.simpleName} must implement DefaultHardwareBackBtnHandler",
                                )
                            host.onHostResume(act, handler)
                            Log.d(
                                TAG,
                                "Called onHostResume with activity: $act",
                            )
                        }
                    }
                    LifecycleState.PAUSED -> {
                        // Activity is paused, call onHostPause
                        pendingActivity?.let { act ->
                            host.onHostPause(act)
                            Log.d(
                                TAG,
                                "Called onHostPause with activity: $act",
                            )
                        }
                    }
                    LifecycleState.DESTROYED -> {
                        // Activity is being destroyed, clean up immediately
                        surface.stop()
                        pendingActivity?.let { act -> host.onHostDestroy(act) }
                        host.invalidate()
                        Log.d(TAG, "Activity destroyed, cleaned up ReactHost")
                    }
                    else -> {
                        Log.d(TAG, "No lifecycle state to apply")
                    }
                }
            }
                ?: Log.w(TAG, "ReactSurface is null, cannot start")
        }
            ?: Log.w(TAG, "ReactHost is null, cannot start")
    }

    private fun loadBundleWithLoader(
        activity: AppCompatActivity,
        bundleLoader: BundleLoader,
        initialProps: Bundle,
    ) {
        activity.lifecycleScope.launch {
            try {
                Log.d(TAG, "loadBundleWithLoader started")
                Log.d(
                    TAG,
                    "bundleLoader type = ${bundleLoader.javaClass.simpleName}",
                )

                // Load bundle (suspend, may run on IO dispatcher)
                val bundleSource = bundleLoader.loadBundle()

                Log.d(TAG, "bundleSource loaded = $bundleSource")
                when (bundleSource) {
                    is BundleSource.Production -> {
                        Log.d(
                            TAG,
                            "bundleSource.location = ${bundleSource.location}",
                        )
                        Log.d(
                            TAG,
                            "bundleSource.componentName = ${bundleSource.componentName}",
                        )
                        if (bundleSource.location is ProductionLocation.FileSystemBundle) {
                            Log.d(
                                TAG,
                                "ACTUAL FILE PATH = ${(bundleSource.location as ProductionLocation.FileSystemBundle).filePath}",
                            )
                        }
                    }
                    is BundleSource.DevServer -> {
                        Log.d(
                            TAG,
                            "DevServer mode - ${bundleSource.host}:${bundleSource.port}",
                        )
                    }
                }

                // Create ReactHost with the loaded bundle (safe off main thread)
                val factoryResult = createReactHostWithBundle(activity, bundleSource)

                // Assign shared state and setup on UI thread to serialize with onDestroy
                activity.runOnUiThread {
                    if (pendingLifecycleState != LifecycleState.DESTROYED) {
                        currentBundleSource = bundleSource
                        reactHost = factoryResult.reactHost
                        componentFactory = factoryResult.componentFactory
                        setupReactHost(activity, initialProps)
                    } else {
                        // Activity already destroyed; clean up the host we just created
                        factoryResult.reactHost.invalidate()
                    }
                }
            } catch (e: Exception) {
                // Show error view on UI thread
                activity.runOnUiThread {
                    if (pendingLifecycleState != LifecycleState.DESTROYED) {
                        errorViewConsumer?.invoke(e)
                            ?: run {
                                // Fallback: Use default behavior if consumer not set
                                val errorView =
                                    errorViewProvider?.invoke(activity, e)
                                        ?: DefaultErrorView(activity, e)
                                contentView = errorView
                                activity.setContentView(errorView)
                            }
                        Log.e(TAG, "Failed to load bundle", e)
                    }
                }
            }
        }
    }

    private fun createReactHostWithBundle(
        activity: AppCompatActivity,
        bundleSource: BundleSource,
    ): ReactHostFactory.Result {
        val packages = reactPackagesProvider?.invoke() ?: emptyList()
        return ReactHostFactory.create(activity.applicationContext, bundleSource, packages)
    }

    companion object {
        // Note: BuildConfig.DEBUG reflects this library's build variant, not the consuming app's.
        private const val TAG = "GraniteReactDelegate"
    }
}
