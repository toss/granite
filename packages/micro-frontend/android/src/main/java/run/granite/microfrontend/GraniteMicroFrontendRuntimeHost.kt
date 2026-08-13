package run.granite.microfrontend

object GraniteMicroFrontendRuntimeHost {
    private val eventRouter = GraniteMicroFrontendRuntimeEventRouter()
    private val sessionStore = GraniteMicroFrontendSessionStore(eventRouter::emit)

    @JvmStatic
    fun registerSession(sessionId: String): GraniteMicroFrontendSessionRegistration =
        sessionStore.registerSession(sessionId)

    @JvmSynthetic
    internal fun emit(event: GraniteMicroFrontendEvent) = eventRouter.emit(event)

    @JvmStatic
    fun emitPreloadApp(appName: String) = emit(GraniteMicroFrontendEvent.PreloadApp(appName))

    @JvmSynthetic
    internal fun emitOpenApp(sessionId: String, appName: String, scheme: String) =
        emit(GraniteMicroFrontendEvent.OpenApp(sessionId, appName, scheme))

    @JvmSynthetic
    internal fun emitCloseApp(sessionId: String) = emit(GraniteMicroFrontendEvent.CloseApp(sessionId))

    @JvmSynthetic
    internal fun emitSessionVisibilityChanged(sessionId: String, isVisible: Boolean) =
        emit(GraniteMicroFrontendEvent.SessionVisibilityChanged(sessionId, isVisible))

    @JvmSynthetic
    internal fun attach(module: GraniteMicroFrontendRuntimeModule) = eventRouter.attach(module)

    @JvmSynthetic
    internal fun startEventDelivery(module: GraniteMicroFrontendRuntimeModule) =
        eventRouter.startEventDelivery(module)

    @JvmSynthetic
    internal fun detach(module: GraniteMicroFrontendRuntimeModule) = eventRouter.detach(module)

    @JvmSynthetic
    internal fun unregisterSession(sessionId: String, token: String) {
        sessionStore.unregisterSession(sessionId, token)
    }
}
