import { useState, useCallback, useRef } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import GraniteVideo, {
  type VideoRef,
  type OnLoadStartData,
  type OnLoadData,
  type OnProgressData,
  type OnSeekData,
  type OnBufferData,
  type OnVideoErrorData,
  type OnPlaybackStateChangedData,
  type ResizeMode,
} from '../../src';

// Test video sources
const TEST_VIDEOS = {
  mp4: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  hls: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  short: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
};

const INVALID_URL = 'https://invalid-video-url.test/video.mp4';

export default function App() {
  const videoRef = useRef<VideoRef>(null);

  // State
  const [logs, setLogs] = useState<string[]>([]);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [rate, setRate] = useState(1.0);
  const [repeat, setRepeat] = useState(false);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('contain');
  const [currentSource, setCurrentSource] = useState(TEST_VIDEOS.mp4);
  const [, setShowError] = useState(false);
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });

  // Logger
  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 29)]);
  }, []);

  // Event Handlers
  const handleLoadStart = useCallback(
    (data: OnLoadStartData) => {
      addLog(`onLoadStart: ${data.type} - ${data.uri.substring(0, 30)}...`);
    },
    [addLog]
  );

  const handleLoad = useCallback(
    (data: OnLoadData) => {
      addLog(`onLoad: ${data.naturalSize.width}x${data.naturalSize.height}, duration: ${data.duration.toFixed(1)}s`);
      setProgress({ currentTime: 0, duration: data.duration });
    },
    [addLog]
  );

  const handleProgress = useCallback((data: OnProgressData) => {
    setProgress({
      currentTime: data.currentTime,
      duration: data.seekableDuration,
    });
  }, []);

  const handleSeek = useCallback(
    (data: OnSeekData) => {
      addLog(`onSeek: ${data.currentTime.toFixed(1)}s -> ${data.seekTime.toFixed(1)}s`);
    },
    [addLog]
  );

  const handleBuffer = useCallback(
    (data: OnBufferData) => {
      addLog(`onBuffer: ${data.isBuffering ? 'buffering' : 'ready'}`);
    },
    [addLog]
  );

  const handleError = useCallback(
    (data: OnVideoErrorData) => {
      addLog(`onError: ${data.error.localizedDescription || data.error.errorString}`);
    },
    [addLog]
  );

  const handleEnd = useCallback(() => {
    addLog('onEnd');
  }, [addLog]);

  const handlePlaybackStateChanged = useCallback(
    (data: OnPlaybackStateChangedData) => {
      addLog(`playbackState: playing=${data.isPlaying}, seeking=${data.isSeeking}`);
    },
    [addLog]
  );

  const handleReadyForDisplay = useCallback(() => {
    addLog('onReadyForDisplay');
  }, [addLog]);

  // Actions
  const togglePlayPause = useCallback(() => {
    setPaused((prev) => !prev);
    addLog(paused ? 'Play' : 'Pause');
  }, [paused, addLog]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
    addLog(muted ? 'Unmuted' : 'Muted');
  }, [muted, addLog]);

  const seekForward = useCallback(() => {
    videoRef.current?.seek(progress.currentTime + 10);
    addLog('Seek +10s');
  }, [progress.currentTime, addLog]);

  const seekBackward = useCallback(() => {
    videoRef.current?.seek(Math.max(0, progress.currentTime - 10));
    addLog('Seek -10s');
  }, [progress.currentTime, addLog]);

  const changeRate = useCallback(
    (newRate: number) => {
      setRate(newRate);
      addLog(`Rate: ${newRate}x`);
    },
    [addLog]
  );

  const changeVolume = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      addLog(`Volume: ${Math.round(newVolume * 100)}%`);
    },
    [addLog]
  );

  const changeResizeMode = useCallback(
    (mode: ResizeMode) => {
      setResizeMode(mode);
      addLog(`ResizeMode: ${mode}`);
    },
    [addLog]
  );

  const changeSource = useCallback(
    (source: string) => {
      setCurrentSource(source);
      setShowError(false);
      addLog(`Source changed`);
    },
    [addLog]
  );

  const triggerError = useCallback(() => {
    setShowError(true);
    setCurrentSource(INVALID_URL);
    addLog('Triggering error with invalid URL');
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView testID="main-scroll" style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text testID="app-title" style={styles.title}>
          GraniteVideo Example
        </Text>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          <GraniteVideo
            ref={videoRef}
            testID="main-video"
            source={{ uri: currentSource }}
            style={styles.video}
            paused={paused}
            muted={muted}
            volume={volume}
            rate={rate}
            repeat={repeat}
            resizeMode={resizeMode}
            controls={false}
            onLoadStart={handleLoadStart}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onSeek={handleSeek}
            onBuffer={handleBuffer}
            onError={handleError}
            onEnd={handleEnd}
            onPlaybackStateChanged={handlePlaybackStateChanged}
            onReadyForDisplay={handleReadyForDisplay}
          />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text testID="progress-time" style={styles.progressText}>
            {formatTime(progress.currentTime)} / {formatTime(progress.duration)}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress.duration > 0 ? (progress.currentTime / progress.duration) * 100 : 0}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Section 1: Basic Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Basic Controls</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity testID="play-pause-button" style={styles.button} onPress={togglePlayPause}>
              <Text style={styles.buttonText}>{paused ? '▶ Play' : '⏸ Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="mute-button" style={styles.button} onPress={toggleMute}>
              <Text style={styles.buttonText}>{muted ? '🔇 Unmute' : '🔊 Mute'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity testID="seek-back-button" style={styles.button} onPress={seekBackward}>
              <Text style={styles.buttonText}>⏪ -10s</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="seek-forward-button" style={styles.button} onPress={seekForward}>
              <Text style={styles.buttonText}>⏩ +10s</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Playback Rate */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Playback Rate</Text>
          <Text testID="rate-label" style={styles.label}>
            Current: {rate}x
          </Text>
          <View style={styles.buttonRow}>
            {[0.5, 1.0, 1.5, 2.0].map((r) => (
              <TouchableOpacity
                key={r}
                testID={`rate-${r}`}
                style={[styles.smallButton, rate === r && styles.activeButton]}
                onPress={() => changeRate(r)}
              >
                <Text style={styles.buttonText}>{r}x</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 3: Volume */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Volume</Text>
          <Text testID="volume-label" style={styles.label}>
            Current: {Math.round(volume * 100)}%
          </Text>
          <View style={styles.buttonRow}>
            {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
              <TouchableOpacity
                key={v}
                testID={`volume-${Math.round(v * 100)}`}
                style={[styles.smallButton, volume === v && styles.activeButton]}
                onPress={() => changeVolume(v)}
              >
                <Text style={styles.buttonText}>{Math.round(v * 100)}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 4: Resize Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Resize Mode</Text>
          <Text testID="resize-mode-label" style={styles.label}>
            Current: {resizeMode}
          </Text>
          <View style={styles.buttonRow}>
            {(['contain', 'cover', 'stretch'] as ResizeMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                testID={`resize-${mode}`}
                style={[styles.smallButton, resizeMode === mode && styles.activeButton]}
                onPress={() => changeResizeMode(mode)}
              >
                <Text style={styles.buttonText}>{mode}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 5: Repeat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Repeat</Text>
          <TouchableOpacity
            testID="repeat-button"
            style={[styles.button, repeat && styles.activeButton]}
            onPress={() => {
              setRepeat((prev) => !prev);
              addLog(`Repeat: ${!repeat}`);
            }}
          >
            <Text style={styles.buttonText}>{repeat ? '🔁 Repeat ON' : '➡ Repeat OFF'}</Text>
          </TouchableOpacity>
        </View>

        {/* Section 6: Source Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Source Selection</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity testID="source-mp4" style={styles.button} onPress={() => changeSource(TEST_VIDEOS.mp4)}>
              <Text style={styles.buttonText}>MP4</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="source-hls" style={styles.button} onPress={() => changeSource(TEST_VIDEOS.hls)}>
              <Text style={styles.buttonText}>HLS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 7: Error Handling */}
        <View testID="error-test" style={styles.section}>
          <Text style={styles.sectionTitle}>7. Error Handling</Text>
          <TouchableOpacity testID="trigger-error" style={styles.button} onPress={triggerError}>
            <Text style={styles.buttonText}>Trigger Error</Text>
          </TouchableOpacity>
        </View>

        {/* Event Logs */}
        <View style={styles.section}>
          <View style={styles.logHeader}>
            <Text style={styles.sectionTitle}>Event Logs</Text>
            <TouchableOpacity testID="clear-logs" onPress={clearLogs}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View testID="log-container" style={styles.logContainer}>
            {logs.length === 0 ? (
              <Text style={styles.logEmpty}>No events yet...</Text>
            ) : (
              logs.map((log, index) => (
                <Text
                  key={index}
                  testID={`log-${log.split(':')[1]?.trim().split(' ')[0] || index}`}
                  style={styles.logText}
                >
                  {log}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper function
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  section: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 12,
  },
  label: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    backgroundColor: '#0f3460',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  smallButton: {
    backgroundColor: '#0f3460',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#e94560',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearText: {
    color: '#e94560',
    fontSize: 14,
  },
  logContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 6,
    padding: 8,
    maxHeight: 200,
  },
  logEmpty: {
    color: '#666',
    fontStyle: 'italic',
  },
  logText: {
    color: '#4CAF50',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
});
