import { createContext, useContext } from 'react';
import type { View } from 'react-native';
import type { MarkerEventListeners } from '../overlays/Marker';

export interface MapContextValue {
  readonly mapView: View;
  markers: Map<string, MarkerEventListeners>;
}

export const MapContext = createContext<MapContextValue | null>(null);

export function useMapContext() {
  return useContext(MapContext);
}
