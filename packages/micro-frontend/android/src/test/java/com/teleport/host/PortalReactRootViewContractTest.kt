package com.teleport.host

import com.facebook.react.ReactHost
import com.facebook.react.ReactRootView
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.common.UIManagerType
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verifyNoInteractions

/**
 * Pins what host apps rely on when they attach their own Fabric root: it renders through Fabric, it
 * carries the surface id the host allocated, and it reports the JS module name the host selected.
 * That it stays a [ReactRootView] needs no assertion of its own — `rootViewTag` is the one property
 * read below that `PortalReactRootView` does not declare, so that read does not compile otherwise.
 *
 * The example app used to assert these by matching substrings in `PortalReactRootView.kt`, which
 * proved nothing about whether the code compiled or behaved. Here the symbols resolve at compile
 * time and the values come off a constructed instance.
 *
 * Three preconditions live outside this file, and all three can break without anyone touching it.
 *
 * 1. `testOptions.unitTests.returnDefaultValues = true` in `android/build.gradle`. The superclass
 *    constructor calls `View.MeasureSpec.makeMeasureSpec` and `setClipChildren`; without the flag the
 *    first one throws `Method makeMeasureSpec in android.view.View$MeasureSpec not mocked.`
 *    `GraniteMicroFrontendRuntimeEventRouterTest` needs the flag too, for `android.util.Log`.
 * 2. The React Native version, which this module does not pin: `build.gradle` declares
 *    `com.facebook.react:react-android` without one, so today's 0.81.0 comes from the consuming app
 *    (`examples/portal/package.json`). On 0.81 `ReactRootView.init()` is pure JVM; from 0.82 it also
 *    reads `enableFontScaleChangesUpdatingLayout`, whose default accessor reaches
 *    `ReactNativeFeatureFlagsCxxInterop`, whose `<clinit>` loads `react_featureflagsjni` through
 *    SoLoader. Stubbing that accessor and leaving the flag at its default only moves the failure —
 *    `init()` then dereferences `getContext()`, which the mockable `android.jar` returns null for.
 *    This lands in consumer builds as well: the library is autolinked as a Gradle subproject, so a
 *    host app running `./gradlew test` runs these tests against its own React Native.
 * 3. Mockito's inline mock maker, the default in mockito-core 5.x. `ThemedReactContext` is `final`,
 *    so the subclass mock maker cannot stand in for it.
 */
class PortalReactRootViewContractTest {
    private val context = mock(ThemedReactContext::class.java)
    private val reactHost = mock(ReactHost::class.java)

    private fun createRootView(moduleName: String) =
        PortalReactRootView(context, reactHost, SURFACE_ID, moduleName)

    @Test
    fun `renders through Fabric`() {
        assertEquals(UIManagerType.FABRIC, createRootView("example-controller").uiManagerType)
    }

    @Test
    fun `carries the surface id the host allocated`() {
        assertEquals(SURFACE_ID, createRootView("example-controller").rootViewTag)
    }

    @Test
    fun `reports each host's own JS module name rather than one baked-in name`() {
        assertEquals("example-controller", createRootView("example-controller").jsModuleName)
        assertEquals("another-controller", createRootView("another-controller").jsModuleName)
    }

    @Test
    fun `builds without calling into the context or the host`() {
        createRootView("example-controller")

        verifyNoInteractions(context, reactHost)
    }

    private companion object {
        // Deliberately not 1, 11, 21, ... — ReactRootViewTagGenerator hands those out from the
        // superclass constructor, so the surface-id assertion would still pass if
        // PortalReactRootView stopped setting the tag itself.
        const val SURFACE_ID = 42
    }
}
