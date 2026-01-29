import { type View } from 'react-native';
import { processColorInput } from '../internals/colorUtils';
import { useMapOverlay } from '../internals/useMapOverlay';
import { usePreservedReference } from '../internals/usePreservedReference';
import { Commands } from '../specs/GraniteNaverMapViewNativeComponent';
import type { Coord } from '../types/Coord';

export interface PolygonProps {
  coordinates: Coord[];
  holes?: Coord[][];
  fillColor?: number | string;
  strokeColor?: number | string;
  strokeWidth?: number;
  zIndex?: number;
}

// Close the ring by adding the first coordinate at the end if not already closed
const closeRing = (coords: Coord[]): Coord[] => {
  if (coords.length < 3) {
    return coords;
  }
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  if (first.latitude === last.latitude && first.longitude === last.longitude) {
    return coords; // Already closed
  }
  return [...coords, first];
};

const add = (v: View, id: string, args: PolygonProps) => {
  const fillColor = processColorInput(args.fillColor, 0x80000000);
  const strokeColor = processColorInput(args.strokeColor, 0xff000000);
  const coordsJson = JSON.stringify(closeRing(args.coordinates));
  const holesJson = JSON.stringify((args.holes ?? []).map(closeRing));

  Commands.addPolygon(
    v as any,
    id,
    coordsJson,
    holesJson,
    fillColor,
    strokeColor,
    args.strokeWidth ?? 0,
    args.zIndex ?? 0
  );
};

const update = (v: View, id: string, args: PolygonProps) => {
  const fillColor = processColorInput(args.fillColor, 0x80000000);
  const strokeColor = processColorInput(args.strokeColor, 0xff000000);
  const coordsJson = JSON.stringify(closeRing(args.coordinates));
  const holesJson = JSON.stringify((args.holes ?? []).map(closeRing));

  Commands.updatePolygon(
    v as any,
    id,
    coordsJson,
    holesJson,
    fillColor,
    strokeColor,
    args.strokeWidth ?? 0,
    args.zIndex ?? 0
  );
};

const remove = (v: View, id: string) => {
  Commands.removePolygon(v as any, id);
};

const methods = { add, update, remove };

export function Polygon(props: PolygonProps) {
  const preserved = usePreservedReference(props);

  useMapOverlay<object, PolygonProps>({
    registrySelector: (c) => c.markers,
    methods,
    props: preserved,
    eventListeners: {},
  });

  return null;
}
