package run.granite.microfrontend

import android.app.Activity
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Answers
import org.mockito.Mockito.mock
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.UUID

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ActivitySessionBindingTest {
    private val events = mutableListOf<GraniteMicroFrontendEvent>()
    private val target = mock(GraniteMicroFrontendRuntimeModule::class.java) { invocation ->
        if (invocation.method.name == "emit") {
            events += invocation.getArgument<GraniteMicroFrontendEvent>(0)
            invocation.getArgument<() -> Unit>(1).invoke()
            true
        } else {
            Answers.RETURNS_DEFAULTS.answer(invocation)
        }
    }
    private val bindings = mutableListOf<ActivitySessionBinding>()

    @Before
    fun attachRecordingRuntime() {
        GraniteMicroFrontendRuntimeHost.attach(target)
        GraniteMicroFrontendRuntimeHost.startEventDelivery(target)
    }

    @After
    fun detachRecordingRuntime() {
        bindings.forEach { it.close() }
        GraniteMicroFrontendRuntimeHost.detach(target)
    }

    @Test
    fun `bind forwards keys and preserves the Java four argument overload`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val sessionId = UUID.randomUUID().toString()
        val binding = ActivitySessionBinding.bind(activity, sessionId, "shopping", "granite://shopping", "native:session", "native:root")
        bindings += binding
        assertEquals(
            GraniteMicroFrontendEvent.OpenApp(sessionId, "shopping", "granite://shopping", "native:session", "native:root"),
            events.single(),
        )
        assertNotNull(ActivitySessionBinding::class.java.getMethod("bind", Activity::class.java,
            String::class.java, String::class.java, String::class.java))
        assertSame(binding, ActivitySessionBinding.bind(activity, sessionId, "shopping", "granite://shopping"))
        assertEquals(1, events.size)
    }

    @Test
    fun `invalid binding metadata does not register a session or lifecycle binding`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val sessionId = UUID.randomUUID().toString()
        assertThrows(IllegalArgumentException::class.java) {
            ActivitySessionBinding.bind(activity, sessionId, "shopping", "granite://shopping", "", "native:root")
        }
        assertThrows(IllegalArgumentException::class.java) {
            ActivitySessionBinding.bind(activity, sessionId, "shopping", "granite://shopping", "native:session", "")
        }
        assertTrue(events.isEmpty())
        val binding = ActivitySessionBinding.bind(activity, sessionId, "shopping", "granite://shopping", "native:session", "native:root")
        bindings += binding
        assertEquals(1, events.size)
    }
}
