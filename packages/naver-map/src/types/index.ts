import type { NativeSyntheticEvent } from 'react-native';
import type {
  OnCameraChangeEvent,
  OnTouchEvent,
  OnMapClickEvent,
  OnMarkerClickEvent,
} from '../specs/GraniteNaverMapViewNativeComponent';

export * from './Coord';

// ============================================================
// Event Types
// ============================================================

/**
 * Camera change event data
 */
export interface CameraChangeEvent {
  latitude: number;
  longitude: number;
  zoom: number;
}

/**
 * Touch event data
 */
export interface TouchEvent {
  reason: number;
  animated: boolean;
}

/**
 * Map click event data
 */
export interface MapClickEvent {
  x: number;
  y: number;
  latitude: number;
  longitude: number;
}

/**
 * Marker click event data
 */
export interface MarkerClickEvent {
  id: string;
}

// ============================================================
// Component Props
// ============================================================

export interface NaverMapViewProps {
  /**
   * Callback when map is initialized
   */
  onInitialized?: () => void;

  /**
   * Callback when camera changes
   */
  onCameraChange?: (event: NativeSyntheticEvent<OnCameraChangeEvent>) => void;

  /**
   * Callback when map is touched
   */
  onTouch?: (event: NativeSyntheticEvent<OnTouchEvent>) => void;

  /**
   * Callback when map is clicked
   */
  onMapClick?: (event: NativeSyntheticEvent<OnMapClickEvent>) => void;

  /**
   * Callback when marker is clicked
   */
  onMarkerClick?: (event: NativeSyntheticEvent<OnMarkerClickEvent>) => void;
}
