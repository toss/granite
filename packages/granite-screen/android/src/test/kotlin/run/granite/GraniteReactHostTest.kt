package run.granite

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactPackage
import java.lang.ref.WeakReference
import java.lang.reflect.Proxy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [31], manifest = Config.NONE)
class GraniteReactHostTest {
    private class Registration { var handler: ((Exception) -> Unit)? = null }

    private open class Host(override val graniteDelegate: GraniteReactDelegate) : GraniteReactHost {
        val received = mutableListOf<Exception>()
        override fun getReactPackages(): List<ReactPackage> = emptyList()
        override fun createBundleLoader(): BundleLoader = error("unused")
        override fun handleInstanceException(error: Exception) { received += error }
    }

    private val activity = Robolectric.buildActivity(AppCompatActivity::class.java).create().get()

    // A mock would record every argument, including provider lambdas that capture the host.
    private fun recordingDelegate(registration: Registration): GraniteReactDelegate =
        Proxy.newProxyInstance(javaClass.classLoader, arrayOf(GraniteReactDelegate::class.java)) { _, method, args ->
            if (method.name == "setExceptionHandler") {
                @Suppress("UNCHECKED_CAST")
                registration.handler = args!![0] as (Exception) -> Unit
            }
            null
        } as GraniteReactDelegate

    private fun setUpHost(registration: Registration): WeakReference<Host> {
        val host = Host(recordingDelegate(registration))
        with(host) { activity.setupHost(null, Bundle()) }
        return WeakReference(host)
    }

    private fun isCollected(ref: WeakReference<*>): Boolean {
        repeat(50) {
            if (ref.get() == null) return true
            System.gc()
            Thread.sleep(20)
        }
        return ref.get() == null
    }

    @Test fun registeredHandlerForwardsToTheHost() {
        val registration = Registration()
        val host = Host(recordingDelegate(registration))
        with(host) { activity.setupHost(null, Bundle()) }
        val error = IllegalStateException("instance")
        registration.handler!!.invoke(error)
        assertEquals(listOf(error), host.received)
    }

    @Test fun registeredHandlerDoesNotKeepTheHostAlive() {
        val registration = Registration()
        val hostRef = setUpHost(registration)
        val handler = registration.handler!!
        assertTrue(isCollected(hostRef))
        handler(IllegalStateException("after collection"))
    }

    @Test fun setupHostRegistersTheOverriddenHandler() {
        val registration = Registration()
        val custom: (Exception) -> Unit = {}
        val host = object : Host(recordingDelegate(registration)) {
            override fun createInstanceExceptionHandler() = custom
        }
        with(host) { activity.setupHost(null, Bundle()) }
        assertSame(custom, registration.handler)
    }
}
