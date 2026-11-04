package run.granite.rncomponentview

import android.content.Context
import com.facebook.react.ReactHost
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import org.junit.Assert.assertFalse
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockStatic
import org.mockito.Mockito.`when`

/**
 * `ReactHost` can report its React instance running before it starts the surfaces waiting for it, and a surface has
 * id 0 until it starts. A root built for id 0 would send every touch to a surface that does not exist.
 */
class RNComponentViewActivationTest {
    @Test
    fun `waits for the surface to start`() {
        mockStatic(UiThreadUtil::class.java).use {
            val reactContext = mock(ReactApplicationContext::class.java)
            `when`(reactContext.hasActiveReactInstance()).thenReturn(true)
            val reactHost = mock(ReactHost::class.java)
            `when`(reactHost.currentReactContext).thenReturn(reactContext)
            val view = RNComponentView(
                mock(Context::class.java),
                componentName = "Demo",
                props = emptyMap(),
                sizing = RNComponentViewSizing.CONSTRAINED,
            )

            assertFalse(view.activate(reactHost, surfaceId = 0, moduleName = "Controller"))
        }
    }
}
