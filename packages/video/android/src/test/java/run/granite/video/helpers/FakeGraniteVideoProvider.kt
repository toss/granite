package run.granite.video.helpers

import android.content.Context
import android.view.View
import io.mockk.mockk
import run.granite.video.provider.*

class FakeGraniteVideoProvider(
    override val providerId: String = "fake",
    override val providerName: String = "Fake Provider"
) : GraniteVideoProvider {

    override var delegate: GraniteVideoDelegate? = null

    var playCount = 0
        private set
    var pauseCount = 0
        private set
    var seekCount = 0
        private set
    var lastLoadedSource: GraniteVideoSource? = null
        private set
    var lastSeekTime: Double = 0.0
        private set

    private var _isPlaying = false
    private var _currentTime = 0.0
    private var _duration = 0.0
    private var _volume = 1.0f
    private var _muted = false
    private var _rate = 1.0f
    private var _repeat = false

    override val currentTime: Double get() = _currentTime
    override val duration: Double get() = _duration
    override val isPlaying: Boolean get() = _isPlaying

    override fun createPlayerView(context: Context): View = mockk(relaxed = true)

    override fun loadSource(source: GraniteVideoSource) {
        lastLoadedSource = source
        _duration = 0.0
        _currentTime = source.startPosition
        delegate?.onLoadStart(
            isNetwork = source.uri?.startsWith("http") == true,
            type = source.type ?: "unknown",
            uri = source.uri ?: ""
        )
    }

    override fun unload() {
        _isPlaying = false
        _currentTime = 0.0
        _duration = 0.0
        lastLoadedSource = null
    }

    override fun play() {
        playCount++
        _isPlaying = true
        delegate?.onPlaybackStateChanged(isPlaying = true, isSeeking = false, isLooping = _repeat)
    }

    override fun pause() {
        pauseCount++
        _isPlaying = false
        delegate?.onPlaybackStateChanged(isPlaying = false, isSeeking = false, isLooping = _repeat)
    }

    override fun seek(time: Double, tolerance: Double) {
        seekCount++
        lastSeekTime = time
        val previousTime = _currentTime
        _currentTime = time
        delegate?.onSeek(currentTime = previousTime, seekTime = time)
    }

    override fun setVolume(volume: Float) {
        _volume = volume
        delegate?.onVolumeChange(volume)
    }

    override fun setMuted(muted: Boolean) {
        _muted = muted
        delegate?.onVolumeChange(if (muted) 0f else _volume)
    }

    override fun setRate(rate: Float) {
        _rate = rate
        delegate?.onPlaybackRateChange(rate)
    }

    override fun setRepeat(shouldRepeat: Boolean) {
        _repeat = shouldRepeat
    }

    // Test helpers
    fun simulateLoad(duration: Double, width: Double = 1920.0, height: Double = 1080.0) {
        _duration = duration
        delegate?.onLoad(
            GraniteVideoLoadData(
                currentTime = _currentTime,
                duration = duration,
                naturalWidth = width,
                naturalHeight = height,
                orientation = if (width > height) "landscape" else "portrait"
            )
        )
    }

    fun simulateProgress(currentTime: Double) {
        _currentTime = currentTime
        delegate?.onProgress(
            GraniteVideoProgressData(
                currentTime = currentTime,
                playableDuration = _duration,
                seekableDuration = _duration
            )
        )
    }

    fun simulateEnd() {
        _isPlaying = false
        delegate?.onEnd()
    }

    fun simulateError(code: Int, message: String) {
        delegate?.onError(
            GraniteVideoErrorData(
                code = code,
                domain = "Fake",
                localizedDescription = message,
                errorString = message
            )
        )
    }

    fun simulateBuffer(isBuffering: Boolean) {
        delegate?.onBuffer(isBuffering)
    }

    override fun release() {
        reset()
    }

    fun reset() {
        playCount = 0
        pauseCount = 0
        seekCount = 0
        lastLoadedSource = null
        lastSeekTime = 0.0
        _isPlaying = false
        _currentTime = 0.0
        _duration = 0.0
        _volume = 1.0f
        _muted = false
        _rate = 1.0f
        _repeat = false
        delegate = null
    }
}
