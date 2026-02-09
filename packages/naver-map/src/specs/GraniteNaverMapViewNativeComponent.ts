import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler, Double, Float, Int32, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

// ============================================================
// Event Types
// ============================================================

export type OnCameraChangeEvent = Readonly<{
  latitude: Double;
  longitude: Double;
  zoom: Double;
}>;

export type OnTouchEvent = Readonly<{
  reason: Int32;
  animated: boolean;
}>;

export type OnMapClickEvent = Readonly<{
  x: Double;
  y: Double;
  latitude: Double;
  longitude: Double;
}>;

export type OnMarkerClickEvent = Readonly<{
  id: string;
}>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type OnInitializedEvent = Readonly<{}>;

// Center prop type
type CenterProp = Readonly<{
  latitude: Double;
  longitude: Double;
  zoom?: Double;
  tilt?: Double;
  bearing?: Double;
}>;

// Padding prop type
type PaddingProp = Readonly<{
  top?: Double;
  left?: Double;
  bottom?: Double;
  right?: Double;
}>;

export interface NativeProps extends ViewProps {
  // Camera
  center?: CenterProp;

  // UI Controls
  showsMyLocationButton?: boolean;
  compass?: boolean;
  scaleBar?: boolean;
  zoomControl?: boolean;

  // Map settings
  mapType?: WithDefault<Int32, 0>;
  minZoomLevel?: WithDefault<Double, 0>;
  maxZoomLevel?: WithDefault<Double, 21>;
  buildingHeight?: WithDefault<Float, 1>;
  nightMode?: boolean;
  mapPadding?: PaddingProp;
  locationTrackingMode?: WithDefault<Int32, 0>;

  // Gestures
  scrollGesturesEnabled?: WithDefault<boolean, true>;
  zoomGesturesEnabled?: WithDefault<boolean, true>;
  tiltGesturesEnabled?: WithDefault<boolean, true>;
  rotateGesturesEnabled?: WithDefault<boolean, true>;
  stopGesturesEnabled?: WithDefault<boolean, true>;

  // Events
  onInitialized?: DirectEventHandler<OnInitializedEvent>;
  onCameraChange?: DirectEventHandler<OnCameraChangeEvent>;
  onTouch?: DirectEventHandler<OnTouchEvent>;
  onMapClick?: DirectEventHandler<OnMapClickEvent>;
  onMarkerClick?: DirectEventHandler<OnMarkerClickEvent>;
}

type ComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  animateToCoordinate: (viewRef: React.ElementRef<ComponentType>, latitude: Double, longitude: Double) => void;
  animateToTwoCoordinates: (
    viewRef: React.ElementRef<ComponentType>,
    lat1: Double,
    lng1: Double,
    lat2: Double,
    lng2: Double
  ) => void;
  animateToRegion: (
    viewRef: React.ElementRef<ComponentType>,
    latitude: Double,
    longitude: Double,
    latitudeDelta: Double,
    longitudeDelta: Double
  ) => void;
  setLayerGroupEnabled: (viewRef: React.ElementRef<ComponentType>, group: string, enabled: boolean) => void;
  // Marker
  addMarker: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    latitude: Double,
    longitude: Double,
    width: Int32,
    height: Int32,
    zIndex: Int32,
    rotation: Float,
    flat: boolean,
    alpha: Float,
    pinColor: Int32,
    image: string
  ) => void;
  updateMarker: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    latitude: Double,
    longitude: Double,
    width: Int32,
    height: Int32,
    zIndex: Int32,
    rotation: Float,
    flat: boolean,
    alpha: Float,
    pinColor: Int32,
    image: string
  ) => void;
  removeMarker: (viewRef: React.ElementRef<ComponentType>, identifier: string) => void;
  // Polyline
  addPolyline: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    coordsJson: string,
    strokeWidth: Float,
    strokeColor: Int32,
    zIndex: Int32,
    lineCap: Int32,
    lineJoin: Int32,
    patternJson: string
  ) => void;
  updatePolyline: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    coordsJson: string,
    strokeWidth: Float,
    strokeColor: Int32,
    zIndex: Int32,
    lineCap: Int32,
    lineJoin: Int32,
    patternJson: string
  ) => void;
  removePolyline: (viewRef: React.ElementRef<ComponentType>, identifier: string) => void;
  // Polygon
  addPolygon: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    coordsJson: string,
    holesJson: string,
    fillColor: Int32,
    strokeColor: Int32,
    strokeWidth: Float,
    zIndex: Int32
  ) => void;
  updatePolygon: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    coordsJson: string,
    holesJson: string,
    fillColor: Int32,
    strokeColor: Int32,
    strokeWidth: Float,
    zIndex: Int32
  ) => void;
  removePolygon: (viewRef: React.ElementRef<ComponentType>, identifier: string) => void;
  // Circle
  addCircle: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    latitude: Double,
    longitude: Double,
    radius: Double,
    fillColor: Int32,
    strokeColor: Int32,
    strokeWidth: Float,
    zIndex: Int32
  ) => void;
  updateCircle: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    latitude: Double,
    longitude: Double,
    radius: Double,
    fillColor: Int32,
    strokeColor: Int32,
    strokeWidth: Float,
    zIndex: Int32
  ) => void;
  removeCircle: (viewRef: React.ElementRef<ComponentType>, identifier: string) => void;
  // Path
  addPath: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    coordsJson: string,
    width: Float,
    outlineWidth: Float,
    color: Int32,
    outlineColor: Int32,
    passedColor: Int32,
    passedOutlineColor: Int32,
    patternImage: string,
    patternInterval: Int32,
    progress: Float,
    zIndex: Int32
  ) => void;
  updatePath: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    coordsJson: string,
    width: Float,
    outlineWidth: Float,
    color: Int32,
    outlineColor: Int32,
    passedColor: Int32,
    passedOutlineColor: Int32,
    patternImage: string,
    patternInterval: Int32,
    progress: Float,
    zIndex: Int32
  ) => void;
  removePath: (viewRef: React.ElementRef<ComponentType>, identifier: string) => void;
  // ArrowheadPath
  addArrowheadPath: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    coordsJson: string,
    width: Float,
    outlineWidth: Float,
    color: Int32,
    outlineColor: Int32,
    headSizeRatio: Float,
    zIndex: Int32
  ) => void;
  updateArrowheadPath: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    coordsJson: string,
    width: Float,
    outlineWidth: Float,
    color: Int32,
    outlineColor: Int32,
    headSizeRatio: Float,
    zIndex: Int32
  ) => void;
  removeArrowheadPath: (viewRef: React.ElementRef<ComponentType>, identifier: string) => void;
  // GroundOverlay
  addGroundOverlay: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    southWestLat: Double,
    southWestLng: Double,
    northEastLat: Double,
    northEastLng: Double,
    image: string,
    alpha: Float,
    zIndex: Int32
  ) => void;
  updateGroundOverlay: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    southWestLat: Double,
    southWestLng: Double,
    northEastLat: Double,
    northEastLng: Double,
    image: string,
    alpha: Float,
    zIndex: Int32
  ) => void;
  removeGroundOverlay: (viewRef: React.ElementRef<ComponentType>, identifier: string) => void;
  // InfoWindow
  addInfoWindow: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    latitude: Double,
    longitude: Double,
    text: string,
    alpha: Float,
    zIndex: Int32,
    offsetX: Int32,
    offsetY: Int32
  ) => void;
  updateInfoWindow: (
    viewRef: React.ElementRef<ComponentType>,
    identifier: string,
    latitude: Double,
    longitude: Double,
    text: string,
    alpha: Float,
    zIndex: Int32,
    offsetX: Int32,
    offsetY: Int32
  ) => void;
  removeInfoWindow: (viewRef: React.ElementRef<ComponentType>, identifier: string) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    'animateToCoordinate',
    'animateToTwoCoordinates',
    'animateToRegion',
    'setLayerGroupEnabled',
    // Marker
    'addMarker',
    'updateMarker',
    'removeMarker',
    // Polyline
    'addPolyline',
    'updatePolyline',
    'removePolyline',
    // Polygon
    'addPolygon',
    'updatePolygon',
    'removePolygon',
    // Circle
    'addCircle',
    'updateCircle',
    'removeCircle',
    // Path
    'addPath',
    'updatePath',
    'removePath',
    // ArrowheadPath
    'addArrowheadPath',
    'updateArrowheadPath',
    'removeArrowheadPath',
    // GroundOverlay
    'addGroundOverlay',
    'updateGroundOverlay',
    'removeGroundOverlay',
    // InfoWindow
    'addInfoWindow',
    'updateInfoWindow',
    'removeInfoWindow',
  ],
});

export default codegenNativeComponent<NativeProps>('GraniteNaverMapView') as ComponentType;
