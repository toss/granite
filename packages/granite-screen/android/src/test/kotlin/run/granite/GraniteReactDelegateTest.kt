package run.granite

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactHost
import com.facebook.react.interfaces.fabric.ReactSurface
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.*
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.android.controller.ActivityController
import org.robolectric.annotation.Config
import org.robolectric.annotation.LooperMode

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [31], manifest = Config.NONE)
@LooperMode(LooperMode.Mode.PAUSED)
class GraniteReactDelegateTest {
    private val dispatcher = StandardTestDispatcher()
    private val scope = CoroutineScope(Job() + dispatcher)
    private lateinit var controller: ActivityController<AppCompatActivity>
    private lateinit var activity: AppCompatActivity
    private lateinit var delegate: GraniteReactDelegateImpl
    // ReactHost/ReactSurface are native-runtime boundaries; the Activity and loader are real.
    private val host = mock(ReactHost::class.java)
    private val surface = mock(ReactSurface::class.java)
    private val props = Bundle()
    private val source = BundleSource.Production(ProductionLocation.EmbeddedBundle, "Screen")
    private var creations = 0
    private val errors = mutableListOf<Throwable>()

    @Before fun setUp() {
        Dispatchers.setMain(dispatcher)
        controller = Robolectric.buildActivity(AppCompatActivity::class.java).create()
        activity = controller.get()
        `when`(host.createSurface(activity, "Screen", props)).thenReturn(surface)
        delegate = GraniteReactDelegateImpl().apply {
            setLoadScopeForTest(scope)
            setLoadingViewConsumer {}
            setErrorViewConsumer { errors += it }
            setReactHostForTest { _, _ -> creations++; host }
        }
    }

    @After fun tearDown() {
        scope.cancel()
        dispatcher.scheduler.runCurrent()
        controller.destroy()
        Dispatchers.resetMain()
    }

    private fun start(loader: suspend () -> BundleSource = { source }) {
        delegate.setBundleLoaderProvider { object : BundleLoader {
            override suspend fun loadBundle() = loader()
        } }
        delegate.onCreate(activity, null, props)
    }

    @Test fun cancellationWhileLoadingDoesNotCreateAHostOrShowAnError() = runTest(dispatcher) {
        val bundle = CompletableDeferred<BundleSource>()
        start { bundle.await() }
        runCurrent()
        delegate.cancelPendingHostCreation()
        bundle.complete(source)
        runCurrent()
        assertEquals(0, creations)
        assertNull(delegate.getReactHost())
        assertTrue(errors.isEmpty())
    }

    @Test fun activityDestructionCancelsLoading() = runTest(dispatcher) {
        val bundle = CompletableDeferred<BundleSource>()
        start { bundle.await() }
        runCurrent()
        delegate.onDestroy(activity)
        bundle.complete(source)
        runCurrent()
        assertEquals(0, creations)
        assertTrue(errors.isEmpty())
    }

    @Test fun cancellationDuringCreationReclaimsTheUnattachedHostOnce() = runTest(dispatcher) {
        delegate.setLoadScopeForTest(CoroutineScope(Job() + UnconfinedTestDispatcher(testScheduler)))
        delegate.setReactHostForTest { _, _ ->
            creations++
            delegate.cancelPendingHostCreation()
            host
        }
        start()
        runCurrent()
        assertEquals(1, creations)
        assertNull(delegate.getReactHost())
        verify(host).destroy("GraniteReactDelegate teardown", null)
        verify(host, never()).createSurface(activity, "Screen", props)
        verify(host, never()).invalidate()
        assertTrue(errors.isEmpty())
    }

    @Test fun cancellationBeforeTheMainThreadHandoffPreventsLateAttachment() = runTest(dispatcher) {
        delegate.setLoadScopeForTest(CoroutineScope(Job() + UnconfinedTestDispatcher(testScheduler)))
        start()
        assertEquals(1, creations)
        assertNull(delegate.getReactHost())
        delegate.cancelPendingHostCreation()
        runCurrent()
        verify(host).destroy("GraniteReactDelegate teardown", null)
        verify(host, never()).createSurface(activity, "Screen", props)
        assertTrue(errors.isEmpty())
    }

    @Test fun attachedHostIsNotDestroyedByPendingCancellation() = runTest(dispatcher) {
        start()
        runCurrent()
        assertSame(host, delegate.getReactHost())
        assertTrue(delegate.isReady())
        delegate.cancelPendingHostCreation()
        runCurrent()
        verify(host, never()).destroy(anyString(), isNull())
        delegate.onDestroy(activity)
        verify(host).onHostDestroy(activity)
        verify(host).destroy("GraniteReactDelegate teardown", null)
        verify(host, never()).invalidate()
        assertNull(delegate.getReactHost())
    }

    @Test fun loaderFailureIsReportedWithoutCreatingAHost() = runTest(dispatcher) {
        val failure = IllegalStateException("bundle unavailable")
        start { throw failure }
        runCurrent()
        assertEquals(listOf(failure), errors)
        assertEquals(0, creations)
    }

    @Test fun aNewLoadCancelsThePreviousLoad() = runTest(dispatcher) {
        val previous = CompletableDeferred<BundleSource>()
        start { previous.await() }
        runCurrent()
        start()
        runCurrent()
        previous.complete(source)
        runCurrent()
        assertEquals(1, creations)
        assertSame(host, delegate.getReactHost())
        verify(host, never()).destroy(anyString(), isNull())
        delegate.onDestroy(activity)
    }
}
