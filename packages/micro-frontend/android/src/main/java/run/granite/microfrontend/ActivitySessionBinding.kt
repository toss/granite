package run.granite.microfrontend

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import java.util.WeakHashMap

class ActivitySessionBinding private constructor(
    private val activity: Activity,
    private val registration: GraniteMicroFrontendSessionRegistration,
) : AutoCloseable {
    private val callbacks = object : Application.ActivityLifecycleCallbacks {
        override fun onActivityStarted(target: Activity) {
            if (target === activity) {
                registration.setVisible(true)
            }
        }

        override fun onActivityStopped(target: Activity) {
            if (target === activity) {
                registration.setVisible(false)
            }
        }

        override fun onActivityDestroyed(target: Activity) {
            if (target === activity) {
                close()
            }
        }

        override fun onActivityCreated(target: Activity, savedInstanceState: Bundle?) = Unit
        override fun onActivityResumed(target: Activity) = Unit
        override fun onActivityPaused(target: Activity) = Unit
        override fun onActivitySaveInstanceState(target: Activity, outState: Bundle) = Unit
    }

    init {
        activity.application.registerActivityLifecycleCallbacks(callbacks)
    }

    override fun close() {
        synchronized(boundBindings) {
            if (boundBindings[activity] !== this) {
                return
            }
            boundBindings.remove(activity)
        }
        activity.application.unregisterActivityLifecycleCallbacks(callbacks)
        registration.closeApp()
        registration.close()
    }

    companion object {
        private val mainHandler = Handler(Looper.getMainLooper())
        private val boundBindings = WeakHashMap<Activity, ActivitySessionBinding>()

        @JvmStatic
        fun bind(
            activity: Activity,
            sessionId: String,
            appName: String,
            scheme: String,
        ): ActivitySessionBinding = synchronized(boundBindings) {
            boundBindings[activity]?.also { return@synchronized it }
            val registration = GraniteMicroFrontendRuntimeHost.registerSession(sessionId) {
                if (Looper.myLooper() == Looper.getMainLooper()) {
                    activity.finish()
                } else {
                    mainHandler.post { activity.finish() }
                }
            }
            ActivitySessionBinding(activity, registration).also { binding ->
                boundBindings[activity] = binding
                registration.openApp(appName, scheme)
            }
        }
    }
}
