package run.granite.image.providers

import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.ResponseBody
import okio.Buffer
import okio.ForwardingSource
import okio.buffer
import run.granite.image.GraniteImageProgressCallback

/** Add as an application interceptor to a custom Coil HTTP client to enable byte progress. */
class CoilImageProgressInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())
        val progress = chain.request().tag(CoilImageProgress::class.java) ?: return response
        val body = response.body ?: return response
        if (!response.isSuccessful) return response
        val source = object : ForwardingSource(body.source()) {
            private var loaded = 0L
            private var lastReported = 0L
            private var finished = false

            override fun read(sink: Buffer, byteCount: Long): Long {
                val count = super.read(sink, byteCount)
                if (count != -1L) loaded += count
                val total = body.contentLength()
                if (!finished && (count == -1L || loaded == total || loaded - lastReported >= 64 * 1024)) {
                    progress.report(loaded, if (count == -1L && total < 0) loaded else total)
                    lastReported = loaded
                    finished = count == -1L || loaded == total
                }
                return count
            }
        }.buffer()
        return response.newBuilder().body(object : ResponseBody() {
            override fun contentType() = body.contentType()
            override fun contentLength() = body.contentLength()
            override fun source() = source
        }).build()
    }
}

internal class CoilImageProgress(private val callback: GraniteImageProgressCallback) {
    @Volatile private var cancelled = false

    // Like the OkHttp provider, reports download bytes on the reader's thread.
    fun report(loaded: Long, total: Long) {
        if (!cancelled) callback(loaded, total)
    }

    fun cancel() {
        cancelled = true
    }
}
