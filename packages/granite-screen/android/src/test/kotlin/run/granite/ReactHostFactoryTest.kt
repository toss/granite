package run.granite

import android.content.res.AssetManager
import com.facebook.react.bridge.JSBundleLoaderDelegate
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [31], manifest = Config.NONE)
class ReactHostFactoryTest {
    private class RecordingLoader : JSBundleLoaderDelegate {
        var asset: String? = null
        var file: String? = null
        override fun loadScriptFromAssets(assetManager: AssetManager, assetURL: String, loadSynchronously: Boolean) { asset = assetURL }
        override fun loadScriptFromFile(fileName: String, sourceURL: String, loadSynchronously: Boolean) { file = fileName }
        override fun loadSplitBundleFromFile(fileName: String, sourceURL: String) { file = fileName }
        override fun setSourceURLs(deviceURL: String, remoteURL: String) {}
    }

    @Test fun assetUrisUseAssetManagerAndFilesKeepTheFileLoader() {
        val context = RuntimeEnvironment.getApplication()
        for (path in listOf("assets://feature.hbc", "/data/local/feature.hbc")) {
            val (loader, devSupport) = ReactHostFactory.createBundleLoaderConfig(
                context, BundleSource.Production(ProductionLocation.FileSystemBundle(path), "Screen"),
            )
            val recorder = RecordingLoader()
            loader.loadScript(recorder)
            assertFalse(devSupport)
            assertTrue(if (path.startsWith("assets://")) recorder.asset == path && recorder.file == null
                       else recorder.file == path && recorder.asset == null)
        }
    }
}
