import {
  NaverMapView,
  Marker,
  Polyline,
  Polygon,
  Circle,
  Path,
  type CameraChangeEvent,
  type MapClickEvent,
  GroundOverlay,
  InfoWindow,
  ArrowheadPath,
} from '@granite-js/naver-map';
import { useState, useCallback } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';

// Seoul coordinates
const SEOUL = { latitude: 37.5665, longitude: 126.978 };
const GANGNAM = { latitude: 37.4979, longitude: 127.0276 };
const HONGDAE = { latitude: 37.5563, longitude: 126.9236 };
const ITAEWON = { latitude: 37.5345, longitude: 126.9946 };
const BUSAN = { latitude: 35.1796, longitude: 129.0756 };

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [center, setCenter] = useState({ ...SEOUL, zoom: 11 });
  const [center2, setCenter2] = useState({ ...BUSAN, zoom: 11 });
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

  const moveToLocation = useCallback(
    (location: typeof SEOUL, name: string) => {
      setCenter({ ...location, zoom: 14 });
      addLog(`Move to: ${name}`);
    },
    [addLog]
  );

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
            <Marker
              coordinate={{
                latitude: 37.5676108,
                longitude: 126.9773882,
              }}
              image="https://cdn-icons-png.flaticon.com/512/220/220218.png"
              width={50}
              height={50}
              onPress={() => {
                console.log('Seoul City Hall marker pressed');
              }}
            />
            {/* 경복궁 */}
            <Marker
              coordinate={{
                latitude: 37.5796,
                longitude: 126.977,
              }}
              pinColor="#FF0000"
              width={36}
              height={36}
              onPress={() => {
                console.log('Gyeongbokgung marker pressed');
              }}
            />
            {/* 남산타워 */}
            <Marker
              coordinate={{
                latitude: 37.5512,
                longitude: 126.9882,
              }}
              pinColor="#00FF00"
              width={36}
              height={36}
              onPress={() => {
                console.log('Namsan Tower marker pressed');
              }}
            />
            {/* 명동 */}
            <Marker
              coordinate={{
                latitude: 37.5636,
                longitude: 126.9869,
              }}
              pinColor="#0000FF"
              width={32}
              height={32}
              onPress={() => {
                console.log('Myeongdong marker pressed');
              }}
            />
            {/* 동대문 DDP */}
            <Marker
              coordinate={{
                latitude: 37.5673,
                longitude: 127.0095,
              }}
              pinColor="#FF6600"
              width={32}
              height={32}
              onPress={() => {
                console.log('DDP marker pressed');
              }}
            />
            {/* 이태원 */}
            <Marker
              coordinate={{
                latitude: 37.5345,
                longitude: 126.9946,
              }}
              pinColor="#9900FF"
              width={32}
              height={32}
              alpha={0.8}
              onPress={() => {
                console.log('Itaewon marker pressed');
              }}
            />
            {/* 홍대입구 */}
            <Marker
              coordinate={{
                latitude: 37.5563,
                longitude: 126.9237,
              }}
              pinColor="#FF00FF"
              width={32}
              height={32}
              rotation={45}
              onPress={() => {
                console.log('Hongdae marker pressed');
              }}
            />

            {/* ===== Overlay Examples ===== */}

            {/* Polyline: 서울시청 → 경복궁 → 명동 연결 */}
            <Polyline
              coordinates={[
                { latitude: 37.5666103, longitude: 126.9783882 }, // 서울시청
                { latitude: 37.5796, longitude: 126.977 }, // 경복궁
                { latitude: 37.5636, longitude: 126.9869 }, // 명동
              ]}
              strokeColor="#FF0000"
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />

            {/* Polygon: 숭례문 주변 삼각형 영역 */}
            <Polygon
              coordinates={[
                { latitude: 37.5615, longitude: 126.973 },
                { latitude: 37.5615, longitude: 126.978 },
                { latitude: 37.558, longitude: 126.9755 },
              ]}
              fillColor={0x800000ff}
              strokeColor={0xffff0000}
              strokeWidth={3}
            />

            {/* Circle: 남산타워 주변 원형 영역 (반경 300m) */}
            <Circle
              center={{
                latitude: 37.5512,
                longitude: 126.9882,
              }}
              radius={300}
              fillColor={0x3300ff00}
              strokeColor={0xff00ff00}
              strokeWidth={2}
            />

            {/* Path: 이태원 → DDP 경로 (진행률 표시) */}
            <Path
              coordinates={[
                { latitude: 37.5345, longitude: 126.9946 }, // 이태원
                { latitude: 37.545, longitude: 127.0 },
                { latitude: 37.555, longitude: 127.005 },
                { latitude: 37.5673, longitude: 127.0095 }, // DDP
              ]}
              width={8}
              outlineWidth={2}
              color="#3366FF"
              outlineColor="#FFFFFF"
              passedColor="#AAAAAA"
              passedOutlineColor="#FFFFFF"
              progress={0.5}
            />

            {/* ArrowheadPath: 홍대 → 시청 방향 화살표 경로 */}
            <ArrowheadPath
              coordinates={[
                { latitude: 37.5563, longitude: 126.9237 }, // 홍대
                { latitude: 37.558, longitude: 126.94 },
                { latitude: 37.562, longitude: 126.955 },
                { latitude: 37.5666103, longitude: 126.9783882 }, // 시청
              ]}
              width={6}
              outlineWidth={1}
              color="#FF6600"
              outlineColor="#FFFFFF"
              headSizeRatio={4}
            />

            {/* GroundOverlay: 경복궁 영역에 이미지 오버레이 */}
            <GroundOverlay
              bounds={{
                southWest: { latitude: 37.577, longitude: 126.974 },
                northEast: { latitude: 37.582, longitude: 126.98 },
              }}
              image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7VhNhtgLdxlTNHynZjJJML0nWAz9P90UQpg&s"
              alpha={0.8}
            />

            {/* InfoWindow: 서울시청 위에 정보창 */}
            {/* <InfoWindow
          coordinate={{
            latitude: 37.5666103,
            longitude: 126.9783882,
          }}
          text="서울시청"
          offsetY={-40}
        /> */}

            {/* InfoWindow: 경복궁 위에 정보창 */}
            <InfoWindow
              coordinate={{
                latitude: 37.5796,
                longitude: 126.977,
              }}
              text="경복궁"
              offsetY={-40}
            />
            {showMarkers && (
              <>
                <Marker coordinate={SEOUL} pinColor={0xff0000} onPress={() => handleMarkerPress('Seoul City Hall')} />
                <Marker coordinate={GANGNAM} pinColor={0x00ff00} onPress={() => handleMarkerPress('Gangnam Station')} />
                <Marker coordinate={HONGDAE} pinColor={0x0000ff} onPress={() => handleMarkerPress('Hongdae')} />
                <Marker coordinate={ITAEWON} pinColor={0xffff00} onPress={() => handleMarkerPress('Itaewon')} />
              </>
            )}

            {showPolyline && (
              <Polyline
                coordinates={[SEOUL, GANGNAM, ITAEWON, HONGDAE, SEOUL]}
                strokeWidth={5}
                strokeColor={0xff6b6b}
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
                fillColor={0x4caf5080}
                strokeColor={0x4caf50}
                strokeWidth={2}
              />
            )}

            {showCircle && (
              <Circle center={SEOUL} radius={2000} fillColor={0x2196f340} strokeColor={0x2196f3} strokeWidth={2} />
            )}

            {showPath && (
              <Path
                coordinates={[SEOUL, GANGNAM]}
                width={10}
                color={0xe91e63}
                outlineWidth={2}
                outlineColor={0xffffff}
              />
            )}
          </NaverMapView>
        </View>

        {/* Second Map View - to test multiple map instances */}
        <Text style={styles.mapTitle}>Map 2: Busan (Independent Instance)</Text>
        <View style={styles.mapContainer2}>
          <NaverMapView
            style={styles.map}
            center={center2}
            mapType={0}
            showsMyLocationButton={false}
            compass={true}
            scaleBar={false}
            zoomControl={false}
            onCameraChange={(ev) => {
              addLog(`Map2 Camera: ${ev.latitude.toFixed(4)}, ${ev.longitude.toFixed(4)}`);
            }}
            onMapClick={(ev) => {
              addLog(`Map2 Click: ${ev.latitude.toFixed(4)}, ${ev.longitude.toFixed(4)}`);
            }}
          >
            <Marker coordinate={BUSAN} pinColor={0xff5500} onPress={() => handleMarkerPress('Busan (Map 2)')} />
          </NaverMapView>
        </View>

        {/* Quick switch between maps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>0. Dual Map Test</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setCenter({ ...SEOUL, zoom: 14 });
                addLog('Map1 → Seoul');
              }}
            >
              <Text style={styles.buttonText}>Map1: Seoul</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setCenter2({ ...BUSAN, zoom: 14 });
                addLog('Map2 → Busan');
              }}
            >
              <Text style={styles.buttonText}>Map2: Busan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setCenter2({ ...GANGNAM, zoom: 14 });
                addLog('Map2 → Gangnam');
              }}
            >
              <Text style={styles.buttonText}>Map2: Gangnam</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 1: Location Shortcuts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Quick Navigation</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity testID="goto-seoul" style={styles.button} onPress={() => moveToLocation(SEOUL, 'Seoul')}>
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
            <TouchableOpacity testID="toggle-maptype" style={styles.button} onPress={cycleMapType}>
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
  mapContainer2: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#03DAC5',
    marginBottom: 8,
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
