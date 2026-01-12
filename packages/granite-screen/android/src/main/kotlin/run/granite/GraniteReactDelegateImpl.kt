package run.granite

import android.os.Bundle
import android.view.View
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.facebook.react.ReactHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.JSBundleLoader
import com.facebook.react.bridge.ReactContext
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.defaults.DefaultComponentsRegistry
import com.facebook.react.defaults.DefaultReactHostDelegate
import com.facebook.react.defaults.DefaultTurboModuleManagerDelegate
import com.facebook.react.fabric.ComponentFactory
import com.facebook.react.interfaces.fabric.ReactSurface
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.react.runtime.ReactHostImpl
import com.facebook.react.runtime.ReactSurfaceView
import com.facebook.react.runtime.hermes.HermesInstance
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

        println("🔧 GraniteReactDelegate: Using ${packages.size} React packages")
        packages.forEach { pkg ->
            println("🔧 GraniteReactDelegate: - ${pkg.javaClass.simpleName}")
        }

        if (BuildConfig.DEBUG) {
            println("🔧 GraniteReactDelegate: Running in debug mode")
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
        reactHost?.onHostResume(activity, activity as DefaultHardwareBackBtnHandler)
            ?: println(
                "🔧 GraniteReactDelegate: ReactHost not ready yet, will call onHostResume after creation",
            )
    }

    override fun onPause(activity: AppCompatActivity) {
        // Track pending lifecycle state
        pendingLifecycleState = LifecycleState.PAUSED
        pendingActivityRef = WeakReference(activity)

        // Call onHostPause only if ReactHost exists
        reactHost?.onHostPause(activity)
            ?: println("🔧 GraniteReactDelegate: ReactHost not ready, skipping onHostPause")
    }

    override fun onDestroy(activity: AppCompatActivity) {
        // Track pending lifecycle state
        pendingLifecycleState = LifecycleState.DESTROYED
        pendingActivityRef = null

        // Cleanup only if ReactHost exists
        reactSurface?.stop()
        reactHost?.let { host ->
            host.onHostDestroy(activity)
            host.invalidate()
        }
            ?: println("🔧 GraniteReactDelegate: ReactHost not ready, skipping onHostDestroy")
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

    private fun getMainComponentName(): String {
        // Only use the BundleLoader-provided component name
        currentBundleSource?.let { source ->
            when (source) {
                is BundleSource.DevServer ->
                    source.componentName?.let {
                        return it
                    }
                is BundleSource.Production ->
                    source.componentName?.let {
                        return it
                    }
            }
        }
        throw IllegalStateException(
            "mainComponentName is missing. Use a BundleLoader that provides componentName.",
        )
    }

    // Default (no-loader) ReactHost creation removed; BundleLoader is mandatory.

    private fun setupReactHost(
        activity: AppCompatActivity,
        initialProps: Bundle,
    ) {
        reactHost?.let { host ->
            // Get component name using the method
            val componentName = getMainComponentName()

            println("🔧 GraniteReactDelegate: Using component name: $componentName")

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
                println("🔧 GraniteReactDelegate: Starting ReactSurface")

                // Add ReactInstanceEventListener
                host.addReactInstanceEventListener(
                    object : ReactInstanceEventListener {
                        override fun onReactContextInitialized(context: ReactContext) {
                            println("🔧Granite onReactContextInitialized called")
                            println(
                                "🔧Granite onReactContextInitialized on currentActivity = ${context.currentActivity}",
                            )
                            // Call the host's onReactContextInitialized method
                            pendingActivity?.let { activity ->
                                if (activity is GraniteReactHost) {
                                    println(
                                        "🔧Granite activity.onReactContextInitialized called",
                                    )
                                    activity.onReactContextInitialized(context)
                                }
                            }
                        }
                    },
                )

                // Start the surface
                println("🔧 GraniteReactDelegate: ⚠️ About to call surface.start()")
                println("🔧 GraniteReactDelegate: surface = $surface")
                println(
                    "🔧 GraniteReactDelegate: If AppRegistry.registerComponent was not called, this will fail!",
                )
                surface.start()
                println("🔧 GraniteReactDelegate: surface.start() completed")

                // Apply pending lifecycle state
                println(
                    "🔧 GraniteReactDelegate: Applying pending lifecycle state: $pendingLifecycleState",
                )
                when (pendingLifecycleState) {
                    LifecycleState.RESUMED -> {
                        // Activity is resumed, call onHostResume
                        pendingActivity?.let { act ->
                            host.onHostResume(act, act as DefaultHardwareBackBtnHandler)
                            println(
                                "🔧 GraniteReactDelegate: Called onHostResume with activity: $act",
                            )
                        }
                    }
                    LifecycleState.PAUSED -> {
                        // Activity is paused, call onHostPause
                        pendingActivity?.let { act ->
                            host.onHostPause(act)
                            println(
                                "🔧 GraniteReactDelegate: Called onHostPause with activity: $act",
                            )
                        }
                    }
                    LifecycleState.DESTROYED -> {
                        // Activity is being destroyed, clean up immediately
                        surface.stop()
                        pendingActivity?.let { act -> host.onHostDestroy(act) }
                        host.invalidate()
                        println("🔧 GraniteReactDelegate: Activity destroyed, cleaned up ReactHost")
                    }
                    else -> {
                        println("🔧 GraniteReactDelegate: No lifecycle state to apply")
                    }
                }
            }
                ?: println("🔧 GraniteReactDelegate: ReactSurface is null, cannot start")
        }
            ?: println("🔧 GraniteReactDelegate: ReactHost is null, cannot start")
    }

    private fun loadBundleWithLoader(
        activity: AppCompatActivity,
        bundleLoader: BundleLoader,
        initialProps: Bundle,
    ) {
        activity.lifecycleScope.launch {
            try {
                println("🔧 GraniteReactDelegate: loadBundleWithLoader started")
                println(
                    "🔧 GraniteReactDelegate: bundleLoader type = ${bundleLoader.javaClass.simpleName}",
                )

                // Load bundle
                val bundleSource = bundleLoader.loadBundle()
                currentBundleSource = bundleSource

                println("🔧 GraniteReactDelegate: bundleSource loaded = $bundleSource")
                when (bundleSource) {
                    is BundleSource.Production -> {
                        println(
                            "🔧 GraniteReactDelegate: bundleSource.location = ${bundleSource.location}",
                        )
                        println(
                            "🔧 GraniteReactDelegate: bundleSource.componentName = ${bundleSource.componentName}",
                        )
                        if (bundleSource.location is ProductionLocation.FileSystemBundle) {
                            println(
                                "🔧 GraniteReactDelegate: ⚠️ ACTUAL FILE PATH = ${(bundleSource.location as ProductionLocation.FileSystemBundle).filePath}",
                            )
                        }
                    }
                    is BundleSource.DevServer -> {
                        println(
                            "🔧 GraniteReactDelegate: DevServer mode - ${bundleSource.host}:${bundleSource.port}",
                        )
                    }
                }

                // Create ReactHost with the loaded bundle
                reactHost = createReactHostWithBundle(activity, bundleSource)

                // Setup ReactHost on UI thread
                activity.runOnUiThread { setupReactHost(activity, initialProps) }
            } catch (e: Exception) {
                // Show error view on UI thread
                activity.runOnUiThread {
                    errorViewConsumer?.invoke(e)
                        ?: run {
                            // Fallback: Use default behavior if consumer not set
                            val errorView =
                                errorViewProvider?.invoke(activity, e)
                                    ?: DefaultErrorView(activity, e)
                            contentView = errorView
                            activity.setContentView(errorView)
                        }
                    println("❌ GraniteReactDelegate: Failed to load bundle: ${e.message}")
                    e.printStackTrace()
                }
            }
        }
    }

    private fun createReactHostWithBundle(
        activity: AppCompatActivity,
        bundleSource: BundleSource,
    ): ReactHost {
        val packages = reactPackagesProvider?.invoke() ?: emptyList()

        println(
            "🔧 GraniteReactDelegate: Creating independent ReactHost instance with bundle source: $bundleSource",
        )

        // Determine bundle configuration based on source
        val (jsBundleLoader, useDevSupport) =
            when (bundleSource) {
                is BundleSource.DevServer -> {
                    // For dev mode, use asset bundle but enable dev support
                    JSBundleLoader.createAssetLoader(
                        activity,
                        "assets://index.android.bundle",
                        true,
                    ) to true
                }
                is BundleSource.Production -> {
                    when (bundleSource.location) {
                        is ProductionLocation.FileSystemBundle -> {
                            // Use file system bundle
                            val filePath = bundleSource.location.filePath
                            println(
                                "🔧 GraniteReactDelegate: Creating JSBundleLoader.createFileLoader with path: $filePath",
                            )
                            println(
                                "🔧 GraniteReactDelegate: ⚠️ THIS IS THE BUNDLE THAT WILL BE LOADED INTO HERMES",
                            )
                            JSBundleLoader.createFileLoader(filePath) to false
                        }
                        is ProductionLocation.EmbeddedBundle -> {
                            // Use embedded asset bundle
                            println(
                                "🔧 GraniteReactDelegate: Creating JSBundleLoader for embedded asset bundle",
                            )
                            JSBundleLoader.createAssetLoader(
                                activity,
                                "assets://index.android.bundle",
                                true,
                            ) to false
                        }
                    }
                }
            }

        println("🔧 GraniteReactDelegate: JSBundleLoader created, useDevSupport=$useDevSupport")

        // 1. Create TurboModuleManagerDelegate Builder
        val tmmDelegateBuilder = DefaultTurboModuleManagerDelegate.Builder()
        // Add C++ packages if needed in the future
        // tmmDelegateBuilder.addCxxReactPackage { MyCxxPackage() }

        // 2. Create ReactHostDelegate
        val reactHostDelegate =
            DefaultReactHostDelegate(
                jsMainModulePath = "index",
                jsBundleLoader = jsBundleLoader,
                reactPackages = packages,
                jsRuntimeFactory = HermesInstance(),
                bindingsInstaller = null,
                turboModuleManagerDelegateBuilder = tmmDelegateBuilder,
                exceptionHandler = { ex ->
                    println("❌ GraniteReactDelegate: ReactHost exception: ${ex.message}")
                    ex.printStackTrace()
                },
            )

        // 3. Create ComponentFactory and register
        val newComponentFactory = ComponentFactory()
        DefaultComponentsRegistry.register(newComponentFactory)
        componentFactory = newComponentFactory

        println(
            "🔧 GraniteReactDelegate: Created ComponentFactory and registered with DefaultComponentsRegistry",
        )

        // 4. Create ReactHostImpl directly (independent instance per delegate)
        // Use applicationContext to prevent Activity memory leak
        val allowPackagerServerAccess = useDevSupport
        val reactHostImpl =
            ReactHostImpl(
                activity,
                reactHostDelegate,
                newComponentFactory,
                allowPackagerServerAccess,
                useDevSupport,
            )

        println(
            "🔧 GraniteReactDelegate: Created independent ReactHostImpl (useDevSupport=$useDevSupport)",
        )

        return reactHostImpl
    }
}
