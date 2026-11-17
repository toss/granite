package run.granite.microfrontend

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.mockito.Mockito.mockStatic

class GraniteMicroFrontendEventTest {
    @Test
    fun `serialized open event includes opaque keys without changing them`() {
        mockStatic(Arguments::class.java).use { arguments ->
            // Replace JNI map allocation only; exercise the production serializer.
            arguments.`when`<Any> { Arguments.createMap() }.thenAnswer { JavaOnlyMap() }
            val event = GraniteMicroFrontendEvent.OpenApp(
                "session-1", "shopping", "granite://shopping", "native:session/α", "native:root",
            ).toWritableMap()
            val params = requireNotNull(event.getMap("params"))

            assertEquals("openApp", event.getString("name"))
            assertEquals("session-1", params.getString("sessionId"))
            assertEquals("shopping", params.getString("appName"))
            assertEquals("granite://shopping", params.getString("scheme"))
            assertEquals("native:session/α", params.getString("key"))
            assertEquals("native:root", params.getString("rootKey"))
        }
    }

    @Test
    fun `legacy serialized open event omits optional keys`() {
        mockStatic(Arguments::class.java).use { arguments ->
            arguments.`when`<Any> { Arguments.createMap() }.thenAnswer { JavaOnlyMap() }
            val event = GraniteMicroFrontendEvent.OpenApp("session-1", "shopping", "granite://shopping")
                .toWritableMap()
            val params = requireNotNull(event.getMap("params"))

            assertEquals("openApp", event.getString("name"))
            assertFalse(params.hasKey("key"))
            assertFalse(params.hasKey("rootKey"))
        }
    }
}
