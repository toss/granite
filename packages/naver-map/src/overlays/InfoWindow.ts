import { type View } from 'react-native';
import { useMapOverlay } from '../internals/useMapOverlay';
import { usePreservedReference } from '../internals/usePreservedReference';
import type { Coord } from '../types/Coord';
import { Commands } from '../specs/GraniteNaverMapViewNativeComponent';

export interface InfoWindowProps {
  coordinate: Coord;
  text: string;
  alpha?: number;
  zIndex?: number;
  offsetX?: number;
  offsetY?: number;
  onPress?: () => void;
}

export interface InfoWindowEventListeners {
  onPress?: () => void;
}

const add = (v: View, id: string, args: InfoWindowProps) => {
  Commands.addInfoWindow(
    v as any,
    id,
    args.coordinate.latitude,
    args.coordinate.longitude,
    args.text,
    args.alpha ?? 1,
    args.zIndex ?? 0,
    args.offsetX ?? 0,
    args.offsetY ?? 0
  );
};

const update = (v: View, id: string, args: InfoWindowProps) => {
  Commands.updateInfoWindow(
    v as any,
    id,
    args.coordinate.latitude,
    args.coordinate.longitude,
    args.text,
    args.alpha ?? 1,
    args.zIndex ?? 0,
    args.offsetX ?? 0,
    args.offsetY ?? 0
  );
};

const remove = (v: View, id: string) => {
  Commands.removeInfoWindow(v as any, id);
};

const methods = { add, update, remove };

export function InfoWindow(props: InfoWindowProps) {
  const preserved = usePreservedReference(props);

  useMapOverlay<InfoWindowEventListeners, InfoWindowProps>({
    registrySelector: (c) => c.markers,
    methods,
    props: preserved,
    eventListeners: {
      onPress: props.onPress,
    },
  });

  return null;
}
