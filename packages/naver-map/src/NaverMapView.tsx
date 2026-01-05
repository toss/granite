import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MapContext } from './internals/context';
import type { MarkerEventListeners } from './overlays/Marker';
import type { Coord } from './types/Coord';
import RNNaverMapViewNativeComponent from './specs/RNNaverMapViewNativeComponent';

export interface CameraChangeEvent extends Coord {
  zoom: number;
}

export interface TouchEvent {
  reason: number;
  animated: boolean;
}

export interface MapClickEvent {
  x: number;
  y: number;
  latitude: number;
  longitude: number;
}

export interface MapViewProps {
  style?: StyleProp<ViewStyle>;
  center?: Coord & {
    zoom?: number;
    tilt?: number;
    bearing?: number;
  };
  showsMyLocationButton?: boolean;
  compass?: boolean;
  scaleBar?: boolean;
  zoomControl?: boolean;
  mapType?: number;
  minZoomLevel?: number;
  maxZoomLevel?: number;
  buildingHeight?: number;
  locationTrackingMode?: number;
  tilt?: number;
  bearing?: number;
  nightMode?: boolean;
  mapPadding?: {
    top?: number;
    left?: number;
    bottom?: number;
    right?: number;
  };
  scrollGesturesEnabled?: boolean;
  zoomGesturesEnabled?: boolean;
  tiltGesturesEnabled?: boolean;
  rotateGesturesEnabled?: boolean;
  stopGesturesEnabled?: boolean;
  onCameraChange?: (ev: CameraChangeEvent) => void;
  onTouch?: (ev: TouchEvent) => void;
  onMapClick?: (ev: MapClickEvent) => void;
  children?: React.ReactNode;
}

type NativeCameraChangeEvent = NativeSyntheticEvent<
  Readonly<{
    latitude: number;
    longitude: number;
    zoom: number;
  }>
>;

type NativeTouchEvent = NativeSyntheticEvent<{
  reason: number;
  animated: boolean;
}>;

type NativeMapClickEvent = NativeSyntheticEvent<{
  x: number;
  y: number;
  latitude: number;
  longitude: number;
}>;

type NativeMarkerClickEvent = NativeSyntheticEvent<{
  id: string;
}>;

/**
 * Avoid View Flattening issue on Android
 */
const AvoidViewFlatteningOnAndroid = ({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) => {
  if (Platform.OS === 'android') {
    return (
      <View style={style} collapsable={false}>
        {children}
      </View>
    );
  }
  return <>{children}</>;
};

export function NaverMapView({
  style,
  onTouch,
  onMapClick,
  onCameraChange,
  children,
  center,
  mapPadding,
  ...props
}: MapViewProps) {
  const mapRef = useRef<React.ElementRef<typeof RNNaverMapViewNativeComponent>>(null);
  const [isReady, setIsReady] = useState(false);
  const markersRef = useRef<Map<string, MarkerEventListeners>>(new Map());

  const onMarkerClick = useCallback(
    (event: NativeMarkerClickEvent) => {
      const marker = markersRef.current.get(event.nativeEvent.id);
      marker?.onPress?.();
    },
    []
  );

  const handleCameraChange = useCallback(
    (event: NativeCameraChangeEvent) => {
      const { latitude, longitude, zoom } = event.nativeEvent;
      onCameraChange?.({
        latitude,
        longitude,
        zoom,
      });
    },
    [onCameraChange]
  );

  const handleTouch = useCallback(
    (event: NativeTouchEvent) => {
      onTouch?.(event.nativeEvent);
    },
    [onTouch]
  );

  const handleMapClick = useCallback(
    (event: NativeMapClickEvent) => {
      onMapClick?.(event.nativeEvent);
    },
    [onMapClick]
  );

  const handleInitialized = useCallback(() => {
    console.log('[NaverMapView] handleInitialized called - setting isReady to true');
    setIsReady(true);
  }, []);

  const mapContext = useMemo(
    () =>
      isReady && mapRef.current
        ? { mapView: mapRef.current, markers: markersRef.current }
        : null,
    [isReady]
  );

  // Convert center prop to native format
  const nativeCenter = useMemo(() => {
    if (!center) return undefined;
    return {
      latitude: center.latitude,
      longitude: center.longitude,
      zoom: center.zoom,
      tilt: center.tilt,
      bearing: center.bearing,
    };
  }, [center]);

  // Convert mapPadding prop to native format
  const nativeMapPadding = useMemo(() => {
    if (!mapPadding) return undefined;
    return {
      top: mapPadding.top,
      left: mapPadding.left,
      bottom: mapPadding.bottom,
      right: mapPadding.right,
    };
  }, [mapPadding]);

  return (
    <AvoidViewFlatteningOnAndroid style={style}>
      <MapContext.Provider value={mapContext}>
        <RNNaverMapViewNativeComponent
          ref={mapRef}
          style={Platform.OS === 'ios' ? style : { flex: 1 }}
          {...props}
          center={nativeCenter}
          mapPadding={nativeMapPadding}
          onInitialized={handleInitialized}
          onMarkerClick={onMarkerClick}
          onCameraChange={handleCameraChange}
          onTouch={handleTouch}
          onMapClick={handleMapClick}
        />
        {children}
      </MapContext.Provider>
    </AvoidViewFlatteningOnAndroid>
  );
}
