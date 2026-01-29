import { type View } from 'react-native';
import { processColorInput } from '../internals/colorUtils';
import { useMapOverlay } from '../internals/useMapOverlay';
import { usePreservedReference } from '../internals/usePreservedReference';
import { Commands } from '../specs/GraniteNaverMapViewNativeComponent';
import type { Coord } from '../types/Coord';

export interface MarkerProps extends MarkerEventListeners {
  coordinate: Coord;
  pinColor?: number | string;
  image?: string;
  rotation?: number;
  flat?: boolean;
  width?: number;
  height?: number;
  alpha?: number;
  zIndex?: number;
}

export interface MarkerEventListeners {
  onPress?: () => void;
}

const add = (v: View, id: string, args: MarkerProps) => {
  // pinColor: 0 means use default icon, otherwise process the color
  const pinColor = args.pinColor != null ? processColorInput(args.pinColor, 0) : 0;

  Commands.addMarker(
    v as any,
    id,
    args.coordinate.latitude,
    args.coordinate.longitude,
    args.width ?? 0,
    args.height ?? 0,
    args.zIndex ?? 0,
    args.rotation ?? 0,
    args.flat ?? false,
    args.alpha ?? 1,
    pinColor,
    args.image ?? ''
  );
};

const update = (v: View, id: string, args: MarkerProps) => {
  // pinColor: 0 means use default icon, otherwise process the color
  const pinColor = args.pinColor != null ? processColorInput(args.pinColor, 0) : 0;

  Commands.updateMarker(
    v as any,
    id,
    args.coordinate.latitude,
    args.coordinate.longitude,
    args.width ?? 0,
    args.height ?? 0,
    args.zIndex ?? 0,
    args.rotation ?? 0,
    args.flat ?? false,
    args.alpha ?? 1,
    pinColor,
    args.image ?? ''
  );
};

const remove = (v: View, id: string) => {
  Commands.removeMarker(v as any, id);
};

const methods = { add, update, remove };

export function Marker(props: MarkerProps) {
  const preserved = usePreservedReference(props);

  useMapOverlay<MarkerEventListeners, MarkerProps>({
    registrySelector: (c) => c.markers,
    methods,
    props: preserved,
    eventListeners: {
      onPress: props.onPress,
    },
  });

  return null;
}
