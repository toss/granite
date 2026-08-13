package run.granite.microfrontend

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.os.Looper

class ActivitySessionBinding private constructor(
    private val sessionId: String,
    private val application: Application,
    private var activity: Activity?,
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
            if (target !== activity) {
                return
            }
            // A configuration change destroys the Activity instance but not the destination. Keep
            // the session registered and drop the instance so the recreated one can rebind to it.
            if (target.isChangingConfigurations) {
                activity = null
                return
            }
            close()
        }

        override fun onActivityCreated(target: Activity, savedInstanceState: Bundle?) = Unit
        override fun onActivityResumed(target: Activity) = Unit
        override fun onActivityPaused(target: Activity) = Unit
        override fun onActivitySaveInstanceState(target: Activity, outState: Bundle) = Unit
    }

    init {
        application.registerActivityLifecycleCallbacks(callbacks)
    }

    override fun close() {
        synchronized(boundBindings) {
            if (boundBindings[sessionId] !== this) {
                return
            }
            boundBindings.remove(sessionId)
        }
        activity = null
        application.unregisterActivityLifecycleCallbacks(callbacks)
        registration.closeApp()
        registration.close()
    }

    companion object {
        private val boundBindings = mutableMapOf<String, ActivitySessionBinding>()

        @JvmStatic
        fun bind(
            activity: Activity,
            sessionId: String,
            appName: String,
            scheme: String,
        ): ActivitySessionBinding = synchronized(boundBindings) {
            check(Looper.myLooper() == Looper.getMainLooper()) {
                "ActivitySessionBinding.bind must be called on the main thread"
            }
            boundBindings[sessionId]?.also { binding ->
                binding.activity = activity
                return@synchronized binding
            }
            val registration = GraniteMicroFrontendRuntimeHost.registerSession(sessionId)
            ActivitySessionBinding(sessionId, activity.application, activity, registration).also { binding ->
                boundBindings[sessionId] = binding
                registration.openApp(appName, scheme)
            }
        }
    }
}
