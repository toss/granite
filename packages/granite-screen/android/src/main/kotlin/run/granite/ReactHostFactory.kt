package run.granite

import android.content.Context
import android.util.Log
import com.facebook.react.ReactHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.JSBundleLoader
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.defaults.DefaultComponentsRegistry
import com.facebook.react.defaults.DefaultReactHostDelegate
import com.facebook.react.defaults.DefaultTurboModuleManagerDelegate
import com.facebook.react.fabric.ComponentFactory
import com.facebook.react.runtime.ReactHostImpl
import com.facebook.react.runtime.hermes.HermesInstance

/**
 * Factory for creating independent ReactHost instances configured with a BundleSource.
 * Internal to the granite-screen module.
 */
@OptIn(UnstableReactNativeAPI::class)
internal object ReactHostFactory {

    private const val TAG = "ReactHostFactory"
    private const val DEFAULT_ASSET_BUNDLE = "assets://index.android.bundle"
    private const val DEFAULT_JS_MAIN_MODULE = "index"

    data class Result(
        val reactHost: ReactHost,
        val componentFactory: ComponentFactory,
    )

    fun create(
        applicationContext: Context,
        bundleSource: BundleSource,
        packages: List<ReactPackage>,
    ): Result {
        Log.d(TAG, "Creating ReactHost with bundle source: $bundleSource")

        val (jsBundleLoader, useDevSupport) = createBundleLoaderConfig(applicationContext, bundleSource)

        Log.d(TAG, "JSBundleLoader created, useDevSupport=$useDevSupport")

        val tmmDelegateBuilder = DefaultTurboModuleManagerDelegate.Builder()

        val reactHostDelegate =
            DefaultReactHostDelegate(
                jsMainModulePath = DEFAULT_JS_MAIN_MODULE,
                jsBundleLoader = jsBundleLoader,
                reactPackages = packages,
                jsRuntimeFactory = HermesInstance(),
                bindingsInstaller = null,
                turboModuleManagerDelegateBuilder = tmmDelegateBuilder,
                exceptionHandler = { ex ->
                    Log.e(TAG, "ReactHost exception", ex)
                },
            )

        val newComponentFactory = ComponentFactory()
        DefaultComponentsRegistry.register(newComponentFactory)

        Log.d(TAG, "ComponentFactory created and registered")

        val reactHostImpl =
            ReactHostImpl(
                applicationContext,
                reactHostDelegate,
                newComponentFactory,
                useDevSupport,
                useDevSupport,
            )

        Log.d(TAG, "ReactHostImpl created (useDevSupport=$useDevSupport)")

        return Result(reactHostImpl, newComponentFactory)
    }

    private fun createBundleLoaderConfig(
        context: Context,
        bundleSource: BundleSource,
    ): Pair<JSBundleLoader, Boolean> =
        when (bundleSource) {
            is BundleSource.DevServer -> {
                JSBundleLoader.createAssetLoader(
                    context,
                    DEFAULT_ASSET_BUNDLE,
                    true,
                ) to true
            }
            is BundleSource.Production ->
                when (bundleSource.location) {
                    is ProductionLocation.FileSystemBundle -> {
                        val filePath = bundleSource.location.filePath
                        Log.d(TAG, "Creating file loader with path: $filePath")
                        JSBundleLoader.createFileLoader(filePath) to false
                    }
                    is ProductionLocation.EmbeddedBundle -> {
                        Log.d(TAG, "Creating asset loader for embedded bundle")
                        JSBundleLoader.createAssetLoader(
                            context,
                            DEFAULT_ASSET_BUNDLE,
                            true,
                        ) to false
                    }
                }
        }
}
