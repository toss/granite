import { type View } from 'react-native';
import { useMapOverlay } from '../internals/useMapOverlay';
import { usePreservedReference } from '../internals/usePreservedReference';
import { Commands } from '../specs/GraniteNaverMapViewNativeComponent';
import type { Coord } from '../types/Coord';

export interface GroundOverlayProps {
  bounds: {
    northEast: Coord;
    southWest: Coord;
  };
  image: string;
  alpha?: number;
  zIndex?: number;
}

const add = (v: View, id: string, args: GroundOverlayProps) => {
  Commands.addGroundOverlay(
    v as any,
    id,
    args.bounds.southWest.latitude,
    args.bounds.southWest.longitude,
    args.bounds.northEast.latitude,
    args.bounds.northEast.longitude,
    args.image,
    args.alpha ?? 1,
    args.zIndex ?? 0
  );
};

const update = (v: View, id: string, args: GroundOverlayProps) => {
  Commands.updateGroundOverlay(
    v as any,
    id,
    args.bounds.southWest.latitude,
    args.bounds.southWest.longitude,
    args.bounds.northEast.latitude,
    args.bounds.northEast.longitude,
    args.image,
    args.alpha ?? 1,
    args.zIndex ?? 0
  );
};

const remove = (v: View, id: string) => {
  Commands.removeGroundOverlay(v as any, id);
};

const methods = { add, update, remove };

export function GroundOverlay(props: GroundOverlayProps) {
  const preserved = usePreservedReference(props);

  useMapOverlay<object, GroundOverlayProps>({
    registrySelector: (c) => c.markers,
    methods,
    props: preserved,
    eventListeners: {},
  });

  return null;
}
