import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, View, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from 'react-native';
import { MapContext } from './internals/context';
import type { MarkerEventListeners } from './overlays/Marker';
import GraniteNaverMapViewNativeComponent, {
  OnCameraChangeEvent,
  OnTouchEvent,
  OnMapClickEvent,
  OnMarkerClickEvent,
} from './specs/GraniteNaverMapViewNativeComponent';
import type { Coord } from './types';

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
  onCameraChange?: (event: NativeSyntheticEvent<OnCameraChangeEvent>) => void;
  onTouch?: (event: NativeSyntheticEvent<OnTouchEvent>) => void;
  onMapClick?: (event: NativeSyntheticEvent<OnMapClickEvent>) => void;
  onInitialized?: () => void;
  children?: React.ReactNode;
}

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
  onInitialized,
  children,
  center,
  mapPadding,
  ...props
}: MapViewProps) {
  const mapRef = useRef<React.ElementRef<typeof GraniteNaverMapViewNativeComponent>>(null);
  const [isReady, setIsReady] = useState(false);
  const markersRef = useRef<Map<string, MarkerEventListeners>>(new Map());

  const onMarkerClick = useCallback((event: NativeSyntheticEvent<OnMarkerClickEvent>) => {
    const marker = markersRef.current.get(event.nativeEvent.id);
    marker?.onPress?.();
  }, []);

  const handleCameraChange = useCallback(
    (event: NativeSyntheticEvent<OnCameraChangeEvent>) => {
      onCameraChange?.(event);
    },
    [onCameraChange]
  );

  const handleTouch = useCallback(
    (event: NativeSyntheticEvent<OnTouchEvent>) => {
      onTouch?.(event);
    },
    [onTouch]
  );

  const handleMapClick = useCallback(
    (event: NativeSyntheticEvent<OnMapClickEvent>) => {
      onMapClick?.(event);
    },
    [onMapClick]
  );

  const handleInitialized = useCallback(() => {
    console.log('[NaverMapView] handleInitialized called - setting isReady to true');
    setIsReady(true);
    onInitialized?.();
  }, [onInitialized]);

  const mapContext = useMemo(
    () => (isReady && mapRef.current ? { mapView: mapRef.current, markers: markersRef.current } : null),
    [isReady]
  );

  // Convert center prop to native format
  const nativeCenter = useMemo(() => {
    if (!center) {
      return undefined;
    }
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
    if (!mapPadding) {
      return undefined;
    }
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
        <GraniteNaverMapViewNativeComponent
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
