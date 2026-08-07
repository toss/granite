package run.granite.microfrontend

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GraniteMicroFrontendPreloadRequestsTest {
    @Test
    fun `completion resolves a preload request exactly once`() {
        val requests = GraniteMicroFrontendPreloadRequests()
        val callback = RecordingPreloadCallback()
        val requestId = requests.create(callback)

        assertTrue(requests.complete(requestId, null))
        assertFalse(requests.complete(requestId, null))
        assertTrue(callback.succeeded)
        assertNull(callback.errorMessage)
    }

    @Test
    fun `completion rejects a preload request with the evaluation error`() {
        val requests = GraniteMicroFrontendPreloadRequests()
        val callback = RecordingPreloadCallback()
        val requestId = requests.create(callback)

        assertTrue(requests.complete(requestId, "invalid bundle"))
        assertEquals("invalid bundle", callback.errorMessage)
    }

    @Test
    fun `cancelled preload request ignores a later completion`() {
        val requests = GraniteMicroFrontendPreloadRequests()
        val callback = RecordingPreloadCallback()
        val requestId = requests.create(callback)

        requests.cancel(requestId)

        assertFalse(requests.complete(requestId, null))
        assertFalse(callback.succeeded)
    }
}

private class RecordingPreloadCallback : GraniteMicroFrontendPreloadCallback {
    var succeeded = false
    var errorMessage: String? = null

    override fun onSuccess() {
        succeeded = true
    }

    override fun onFailure(errorMessage: String) {
        this.errorMessage = errorMessage
    }
}
