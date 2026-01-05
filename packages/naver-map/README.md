# react-native-toss-naver-map

Naver Map for React Native

## Installation

```bash
npm install react-native-toss-naver-map
# or
yarn add react-native-toss-naver-map
```

### iOS Setup

1. Add Naver Map SDK to your Podfile:

```ruby
pod 'NMapsMap', '~> 3.17.0'
```

2. Add your Naver Map Client ID to `Info.plist`:

```xml
<key>NMFClientId</key>
<string>YOUR_CLIENT_ID</string>
```

3. Run pod install:

```bash
cd ios && pod install
```

### Android Setup

1. Add the Naver Map repository to your project's `build.gradle`:

```gradle
allprojects {
    repositories {
        maven {
            url 'https://repository.map.naver.com/archive/maven'
        }
    }
}
```

2. Add your Naver Map Client ID to `AndroidManifest.xml`:

```xml
<manifest>
    <application>
        <meta-data
            android:name="com.naver.maps.map.CLIENT_ID"
            android:value="YOUR_CLIENT_ID" />
    </application>
</manifest>
```

## Usage

```tsx
import { NaverMapView, Marker } from 'react-native-toss-naver-map';

function App() {
  return (
    <NaverMapView
      style={{ flex: 1 }}
      center={{
        latitude: 37.5666103,
        longitude: 126.9783882,
        zoom: 14,
      }}
      onMapClick={(event) => {
        console.log('Map clicked:', event);
      }}
    >
      <Marker
        coordinate={{
          latitude: 37.5666103,
          longitude: 126.9783882,
        }}
        onPress={() => {
          console.log('Marker pressed');
        }}
      />
    </NaverMapView>
  );
}
```

## Props

### NaverMapView

| Prop | Type | Description |
|------|------|-------------|
| `style` | `StyleProp<ViewStyle>` | View style |
| `center` | `Coord & { zoom?, tilt?, bearing? }` | Camera center position |
| `showsMyLocationButton` | `boolean` | Show my location button |
| `compass` | `boolean` | Show compass |
| `scaleBar` | `boolean` | Show scale bar |
| `zoomControl` | `boolean` | Show zoom controls |
| `mapType` | `number` | Map type (0: Basic, 1: Navi, etc.) |
| `minZoomLevel` | `number` | Minimum zoom level |
| `maxZoomLevel` | `number` | Maximum zoom level |
| `buildingHeight` | `number` | Building height (0-1) |
| `nightMode` | `boolean` | Enable night mode |
| `scrollGesturesEnabled` | `boolean` | Enable scroll gestures |
| `zoomGesturesEnabled` | `boolean` | Enable zoom gestures |
| `tiltGesturesEnabled` | `boolean` | Enable tilt gestures |
| `rotateGesturesEnabled` | `boolean` | Enable rotate gestures |
| `stopGesturesEnabled` | `boolean` | Enable stop gestures |
| `locationTrackingMode` | `number` | Location tracking mode |
| `onCameraChange` | `(event) => void` | Camera change callback |
| `onMapClick` | `(event) => void` | Map click callback |
| `onTouch` | `(event) => void` | Touch callback |

### Marker

| Prop | Type | Description |
|------|------|-------------|
| `coordinate` | `Coord` | Marker position |
| `pinColor` | `number \| string` | Marker tint color |
| `image` | `string` | Marker image URL |
| `rotation` | `number` | Rotation angle |
| `flat` | `boolean` | Flat marker |
| `width` | `number` | Marker width |
| `height` | `number` | Marker height |
| `alpha` | `number` | Marker opacity |
| `zIndex` | `number` | Z-index |
| `onPress` | `() => void` | Press callback |

## Types

```typescript
interface Coord {
  latitude: number;
  longitude: number;
}

interface CameraChangeEvent extends Coord {
  zoom: number;
  contentRegion: [Coord, Coord, Coord, Coord];
  coveringRegion: [Coord, Coord, Coord, Coord];
}

interface MapClickEvent {
  x: number;
  y: number;
  latitude: number;
  longitude: number;
}
```

## License

MIT
