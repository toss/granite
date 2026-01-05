import { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import {
  NaverMapView,
  Marker,
  Polyline,
  Polygon,
  Circle,
  Path,
  type CameraChangeEvent,
  type MapClickEvent,
} from '@granite-js/naver-map';

// Seoul coordinates
const SEOUL = { latitude: 37.5665, longitude: 126.978 };
const GANGNAM = { latitude: 37.4979, longitude: 127.0276 };
const HONGDAE = { latitude: 37.5563, longitude: 126.9236 };
const ITAEWON = { latitude: 37.5345, longitude: 126.9946 };

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [center, setCenter] = useState({ ...SEOUL, zoom: 11 });
  const [showMarkers, setShowMarkers] = useState(true);
  const [showPolyline, setShowPolyline] = useState(false);
  const [showPolygon, setShowPolygon] = useState(false);
  const [showCircle, setShowCircle] = useState(false);
  const [showPath, setShowPath] = useState(false);
  const [mapType, setMapType] = useState(0);
  const [nightMode, setNightMode] = useState(false);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 19)]);
  }, []);

  const handleCameraChange = useCallback(
    (ev: CameraChangeEvent) => {
      addLog(`Camera: ${ev.latitude.toFixed(4)}, ${ev.longitude.toFixed(4)}, zoom: ${ev.zoom.toFixed(1)}`);
    },
    [addLog]
  );

  const handleMapClick = useCallback(
    (ev: MapClickEvent) => {
      addLog(`Click: ${ev.latitude.toFixed(4)}, ${ev.longitude.toFixed(4)}`);
    },
    [addLog]
  );

  const handleMarkerPress = useCallback(
    (name: string) => {
      addLog(`Marker pressed: ${name}`);
    },
    [addLog]
  );

  const moveToLocation = useCallback((location: typeof SEOUL, name: string) => {
    setCenter({ ...location, zoom: 14 });
    addLog(`Move to: ${name}`);
  }, [addLog]);

  const cycleMapType = useCallback(() => {
    const types = [0, 1, 2, 3, 4]; // Basic, Navi, Satellite, Hybrid, Terrain
    const typeNames = ['Basic', 'Navi', 'Satellite', 'Hybrid', 'Terrain'];
    const nextIndex = (types.indexOf(mapType) + 1) % types.length;
    setMapType(types[nextIndex]!);
    addLog(`Map type: ${typeNames[nextIndex]}`);
  }, [mapType, addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView testID="main-scroll" style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text testID="app-title" style={styles.title}>
          GraniteNaverMap Example
        </Text>

        {/* Map View */}
        <View style={styles.mapContainer}>
          <NaverMapView
            style={styles.map}
            center={center}
            mapType={mapType}
            nightMode={nightMode}
            showsMyLocationButton={true}
            compass={true}
            scaleBar={true}
            zoomControl={true}
            onCameraChange={handleCameraChange}
            onMapClick={handleMapClick}
          >
            {showMarkers && (
              <>
                <Marker
                  coordinate={SEOUL}
                  pinColor={0xFF0000}
                  onPress={() => handleMarkerPress('Seoul City Hall')}
                />
                <Marker
                  coordinate={GANGNAM}
                  pinColor={0x00FF00}
                  onPress={() => handleMarkerPress('Gangnam Station')}
                />
                <Marker
                  coordinate={HONGDAE}
                  pinColor={0x0000FF}
                  onPress={() => handleMarkerPress('Hongdae')}
                />
                <Marker
                  coordinate={ITAEWON}
                  pinColor={0xFFFF00}
                  onPress={() => handleMarkerPress('Itaewon')}
                />
              </>
            )}

            {showPolyline && (
              <Polyline
                coordinates={[SEOUL, GANGNAM, ITAEWON, HONGDAE, SEOUL]}
                strokeWidth={5}
                strokeColor={0xFF6B6B}
              />
            )}

            {showPolygon && (
              <Polygon
                coordinates={[
                  { latitude: 37.57, longitude: 126.97 },
                  { latitude: 37.55, longitude: 127.0 },
                  { latitude: 37.53, longitude: 126.97 },
                  { latitude: 37.55, longitude: 126.94 },
                ]}
                fillColor={0x4CAF5080}
                strokeColor={0x4CAF50}
                strokeWidth={2}
              />
            )}

            {showCircle && (
              <Circle
                coordinate={SEOUL}
                radius={2000}
                fillColor={0x2196F340}
                strokeColor={0x2196F3}
                strokeWidth={2}
              />
            )}

            {showPath && (
              <Path
                coordinates={[SEOUL, GANGNAM]}
                width={10}
                color={0xE91E63}
                outlineWidth={2}
                outlineColor={0xFFFFFF}
              />
            )}
          </NaverMapView>
        </View>

        {/* Section 1: Location Shortcuts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Quick Navigation</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              testID="goto-seoul"
              style={styles.button}
              onPress={() => moveToLocation(SEOUL, 'Seoul')}
            >
              <Text style={styles.buttonText}>Seoul</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="goto-gangnam"
              style={styles.button}
              onPress={() => moveToLocation(GANGNAM, 'Gangnam')}
            >
              <Text style={styles.buttonText}>Gangnam</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="goto-hongdae"
              style={styles.button}
              onPress={() => moveToLocation(HONGDAE, 'Hongdae')}
            >
              <Text style={styles.buttonText}>Hongdae</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Map Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Map Settings</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              testID="toggle-maptype"
              style={styles.button}
              onPress={cycleMapType}
            >
              <Text style={styles.buttonText}>Map Type</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="toggle-nightmode"
              style={[styles.button, nightMode && styles.activeButton]}
              onPress={() => {
                setNightMode(!nightMode);
                addLog(`Night mode: ${!nightMode}`);
              }}
            >
              <Text style={styles.buttonText}>Night Mode</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Overlays */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Overlays</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              testID="toggle-markers"
              style={[styles.smallButton, showMarkers && styles.activeButton]}
              onPress={() => {
                setShowMarkers(!showMarkers);
                addLog(`Markers: ${!showMarkers}`);
              }}
            >
              <Text style={styles.buttonText}>Markers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="toggle-polyline"
              style={[styles.smallButton, showPolyline && styles.activeButton]}
              onPress={() => {
                setShowPolyline(!showPolyline);
                addLog(`Polyline: ${!showPolyline}`);
              }}
            >
              <Text style={styles.buttonText}>Polyline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="toggle-polygon"
              style={[styles.smallButton, showPolygon && styles.activeButton]}
              onPress={() => {
                setShowPolygon(!showPolygon);
                addLog(`Polygon: ${!showPolygon}`);
              }}
            >
              <Text style={styles.buttonText}>Polygon</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              testID="toggle-circle"
              style={[styles.smallButton, showCircle && styles.activeButton]}
              onPress={() => {
                setShowCircle(!showCircle);
                addLog(`Circle: ${!showCircle}`);
              }}
            >
              <Text style={styles.buttonText}>Circle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="toggle-path"
              style={[styles.smallButton, showPath && styles.activeButton]}
              onPress={() => {
                setShowPath(!showPath);
                addLog(`Path: ${!showPath}`);
              }}
            >
              <Text style={styles.buttonText}>Path</Text>
            </TouchableOpacity>
          </View>
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
                <Text key={index} style={styles.logText}>
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
  mapContainer: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: '100%',
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
    color: '#03DAC5',
    marginBottom: 12,
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
    minWidth: 70,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#03DAC5',
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
    color: '#03DAC5',
    fontSize: 14,
  },
  logContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 6,
    padding: 8,
    maxHeight: 150,
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
