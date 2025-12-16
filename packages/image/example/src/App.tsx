import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  ScrollView,
  Text,
  View,
  Button,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {GraniteImage} from 'granite-image';
import type {
  OnLoadEventData,
  OnProgressEventData,
} from 'granite-image';

// Test image URLs
const TEST_IMAGES = {
  basic: 'https://picsum.photos/400/300',
  large: 'https://picsum.photos/800/600',
  error: 'https://invalid-url-that-does-not-exist.com/image.jpg',
  gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDd4Y2o2Y2JjNmFvbGNhN2FqaWF3MWMzOXY4ZHl5NmZ6Y3B4NnR0YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjI6SIIHBdRxXI40/giphy.gif',
  withHeaders: 'https://httpbin.org/image/jpeg',
};

type ResizeMode = 'cover' | 'contain' | 'stretch' | 'center';
type Priority = 'low' | 'normal' | 'high';
type CachePolicy = 'memory' | 'disk' | 'none';

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedResizeMode, setSelectedResizeMode] =
    useState<ResizeMode>('cover');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('normal');
  const [selectedCache, setSelectedCache] = useState<CachePolicy>('disk');
  const [showTint, setShowTint] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  }, []);

  const handleLoadStart = useCallback(() => {
    addLog('onLoadStart');
  }, [addLog]);

  const handleProgress = useCallback(
    (event: OnProgressEventData) => {
      const percent = event.total > 0
        ? Math.round((event.loaded / event.total) * 100)
        : 0;
      addLog(`onProgress: ${event.loaded}/${event.total} (${percent}%)`);
    },
    [addLog],
  );

  const handleLoad = useCallback(
    (event: OnLoadEventData) => {
      addLog(`onLoad: ${event.width}x${event.height}`);
    },
    [addLog],
  );

  const handleError = useCallback(
    (error: {nativeEvent: {error: string}}) => {
      addLog(`onError: ${error.nativeEvent.error}`);
    },
    [addLog],
  );

  const handleLoadEnd = useCallback(() => {
    addLog('onLoadEnd');
  }, [addLog]);

  const handlePreload = useCallback(async () => {
    addLog('Preloading images...');
    try {
      await GraniteImage.preload([
        {uri: 'https://picsum.photos/500/500'},
        {uri: 'https://picsum.photos/600/400', priority: 'high'},
        {
          uri: 'https://picsum.photos/700/700',
          headers: {'X-Custom-Header': 'test'},
        },
      ]);
      addLog('Preload completed!');
    } catch (e) {
      addLog(`Preload error: ${e}`);
    }
  }, [addLog]);

  const handleClearMemoryCache = useCallback(async () => {
    try {
      await GraniteImage.clearMemoryCache();
      addLog('Memory cache cleared');
    } catch (e) {
      addLog(`Clear memory cache error: ${e}`);
    }
  }, [addLog]);

  const handleClearDiskCache = useCallback(async () => {
    try {
      await GraniteImage.clearDiskCache();
      addLog('Disk cache cleared');
    } catch (e) {
      addLog(`Clear disk cache error: ${e}`);
    }
  }, [addLog]);

  const reloadImages = useCallback(() => {
    setImageKey(prev => prev + 1);
    addLog('Reloading images...');
  }, [addLog]);

  return (
    <ScrollView style={styles.container} testID="main-scroll">
      <Text style={styles.title} testID="app-title">
        GraniteImage Example
      </Text>

      {/* Section 1: Basic Image Loading */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Basic Image Loading</Text>
        <GraniteImage
          key={`basic-${imageKey}`}
          source={{uri: TEST_IMAGES.basic}}
          style={styles.image}
          resizeMode="cover"
          testID="basic-image"
          onLoadStart={handleLoadStart}
          onProgress={handleProgress}
          onLoad={handleLoad}
          onLoadEnd={handleLoadEnd}
        />
      </View>

      {/* Section 2: ResizeMode Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. ResizeMode: {selectedResizeMode}</Text>
        <View style={styles.buttonRow}>
          {(['cover', 'contain', 'stretch', 'center'] as ResizeMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.optionButton,
                selectedResizeMode === mode && styles.optionButtonActive,
              ]}
              onPress={() => setSelectedResizeMode(mode)}
              testID={`resize-${mode}`}>
              <Text
                style={[
                  styles.optionText,
                  selectedResizeMode === mode && styles.optionTextActive,
                ]}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <GraniteImage
          key={`resize-${selectedResizeMode}-${imageKey}`}
          source={{uri: 'https://picsum.photos/600/300'}}
          style={styles.wideImage}
          resizeMode={selectedResizeMode}
          testID="resize-image"
        />
      </View>

      {/* Section 3: Priority Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Priority: {selectedPriority}</Text>
        <View style={styles.buttonRow}>
          {(['low', 'normal', 'high'] as Priority[]).map(priority => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.optionButton,
                selectedPriority === priority && styles.optionButtonActive,
              ]}
              onPress={() => setSelectedPriority(priority)}
              testID={`priority-${priority}`}>
              <Text
                style={[
                  styles.optionText,
                  selectedPriority === priority && styles.optionTextActive,
                ]}>
                {priority}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <GraniteImage
          key={`priority-${selectedPriority}-${imageKey}`}
          source={{uri: 'https://picsum.photos/400/400', priority: selectedPriority}}
          style={styles.image}
          testID="priority-image"
        />
      </View>

      {/* Section 4: Cache Policy Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Cache Policy: {selectedCache}</Text>
        <View style={styles.buttonRow}>
          {(['memory', 'disk', 'none'] as CachePolicy[]).map(cache => (
            <TouchableOpacity
              key={cache}
              style={[
                styles.optionButton,
                selectedCache === cache && styles.optionButtonActive,
              ]}
              onPress={() => setSelectedCache(cache)}
              testID={`cache-${cache}`}>
              <Text
                style={[
                  styles.optionText,
                  selectedCache === cache && styles.optionTextActive,
                ]}>
                {cache}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <GraniteImage
          key={`cache-${selectedCache}-${imageKey}`}
          source={{uri: 'https://picsum.photos/450/300'}}
          style={styles.image}
          cachePolicy={selectedCache}
          testID="cache-image"
        />
      </View>

      {/* Section 5: TintColor */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. TintColor</Text>
        <TouchableOpacity
          style={[styles.optionButton, showTint && styles.optionButtonActive]}
          onPress={() => setShowTint(!showTint)}
          testID="tint-toggle">
          <Text style={[styles.optionText, showTint && styles.optionTextActive]}>
            {showTint ? 'Tint ON (Blue)' : 'Tint OFF'}
          </Text>
        </TouchableOpacity>
        <GraniteImage
          key={`tint-${showTint}-${imageKey}`}
          source={{uri: 'https://picsum.photos/400/250'}}
          style={styles.image}
          tintColor={showTint ? '#0066CC' : undefined}
          testID="tint-image"
        />
      </View>

      {/* Section 6: Headers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Custom Headers</Text>
        <GraniteImage
          key={`headers-${imageKey}`}
          source={{
            uri: TEST_IMAGES.withHeaders,
            headers: {
              'X-Custom-Header': 'GraniteImage-Test',
              'Accept': 'image/*',
            },
          }}
          style={styles.image}
          testID="headers-image"
          onLoad={handleLoad}
          onError={handleError}
        />
      </View>

      {/* Section 7: DefaultSource (Placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. DefaultSource (Placeholder)</Text>
        <Text style={styles.hint}>Shows placeholder while loading large image</Text>
        <GraniteImage
          key={`default-source-${imageKey}`}
          source={{uri: 'https://picsum.photos/1200/800'}}
          defaultSource="placeholder"
          style={styles.image}
          testID="default-source-image"
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onLoadEnd={handleLoadEnd}
        />
        <Button
          title="Reload to See Placeholder"
          testID="reload-placeholder-button"
          onPress={() => {
            addLog('Reloading defaultSource image...');
            setImageKey(prev => prev + 1);
          }}
        />
      </View>

      {/* Section 8: Error Handling with Fallback */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Error Handling with Fallback</Text>
        <GraniteImage
          key={`error-${imageKey}`}
          source={{uri: TEST_IMAGES.error}}
          fallbackSource="https://picsum.photos/400/200"
          style={styles.image}
          testID="error-image"
          onError={handleError}
          onLoadEnd={handleLoadEnd}
        />
        <Text style={styles.hint}>Error triggers fallback image (should display image)</Text>
      </View>

      {/* Section 9: GIF Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>9. GIF Support</Text>
        <GraniteImage
          key={`gif-${imageKey}`}
          source={{uri: TEST_IMAGES.gif}}
          style={styles.image}
          testID="gif-image"
          onLoad={handleLoad}
        />
      </View>

      {/* Section 10: Static Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>10. Static Methods</Text>
        <View style={styles.buttonColumn}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePreload}
            testID="preload-button">
            <Text style={styles.actionButtonText}>Preload Images</Text>
          </TouchableOpacity>
          <View style={styles.buttonSpacer} />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearMemoryCache}
            testID="clear-memory-cache-button">
            <Text style={styles.actionButtonText}>Clear Memory Cache</Text>
          </TouchableOpacity>
          <View style={styles.buttonSpacer} />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearDiskCache}
            testID="clear-disk-cache-button">
            <Text style={styles.actionButtonText}>Clear Disk Cache</Text>
          </TouchableOpacity>
          <View style={styles.buttonSpacer} />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={reloadImages}
            testID="reload-all-button">
            <Text style={styles.actionButtonText}>Reload All Images</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section 11: All Callbacks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>11. All Callbacks Test</Text>
        <GraniteImage
          key={`callbacks-${imageKey}`}
          source={{uri: `https://picsum.photos/400/300?random=${imageKey}`}}
          style={styles.image}
          testID="callbacks-image"
          onLoadStart={handleLoadStart}
          onProgress={handleProgress}
          onLoad={handleLoad}
          onError={handleError}
          onLoadEnd={handleLoadEnd}
        />
        <Button
          title="Load New Image"
          testID="load-new-image-button"
          onPress={() => setImageKey(prev => prev + 1)}
        />
      </View>

      {/* Logs Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Logs</Text>
        <View style={styles.logContainer} testID="log-container">
          {logs.length === 0 ? (
            <Text style={styles.logEmpty}>No events yet</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={index} style={styles.logText} testID={`log-${index}`}>
                {log}
              </Text>
            ))
          )}
        </View>
        <Button title="Clear Logs" onPress={() => setLogs([])} />
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  wideImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  buttonSpacer: {
    height: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  hint: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    maxHeight: 200,
  },
  logEmpty: {
    color: '#666',
    fontStyle: 'italic',
  },
  logText: {
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 4,
  },
  footer: {
    height: 50,
  },
});
