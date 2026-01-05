import { type View } from 'react-native';
import { useMapOverlay } from '../internals/useMapOverlay';
import { usePreservedReference } from '../internals/usePreservedReference';
import { processColorInput } from '../internals/colorUtils';
import type { Coord } from '../types/Coord';
import { Commands } from '../specs/RNNaverMapViewNativeComponent';

export interface PolylineProps {
  coordinates: Coord[];
  strokeColor?: number | string;
  strokeWidth?: number;
  zIndex?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'bevel' | 'miter' | 'round';
  pattern?: number[];
}

const lineCapToInt = (cap?: string): number => {
  switch (cap) {
    case 'round': return 1;
    case 'square': return 2;
    default: return 0; // butt
  }
};

const lineJoinToInt = (join?: string): number => {
  switch (join) {
    case 'miter': return 1;
    case 'round': return 2;
    default: return 0; // bevel
  }
};

const add = (v: View, id: string, args: PolylineProps) => {
  const strokeColor = processColorInput(args.strokeColor, 0xFF000000);
  const coordsJson = JSON.stringify(args.coordinates);
  const patternJson = JSON.stringify(args.pattern ?? []);

  Commands.addPolyline(
    v as any,
    id,
    coordsJson,
    args.strokeWidth ?? 1,
    strokeColor,
    args.zIndex ?? 0,
    lineCapToInt(args.lineCap),
    lineJoinToInt(args.lineJoin),
    patternJson
  );
};

const update = (v: View, id: string, args: PolylineProps) => {
  const strokeColor = processColorInput(args.strokeColor, 0xFF000000);
  const coordsJson = JSON.stringify(args.coordinates);
  const patternJson = JSON.stringify(args.pattern ?? []);

  Commands.updatePolyline(
    v as any,
    id,
    coordsJson,
    args.strokeWidth ?? 1,
    strokeColor,
    args.zIndex ?? 0,
    lineCapToInt(args.lineCap),
    lineJoinToInt(args.lineJoin),
    patternJson
  );
};

const remove = (v: View, id: string) => {
  Commands.removePolyline(v as any, id);
};

const methods = { add, update, remove };

export function Polyline(props: PolylineProps) {
  const preserved = usePreservedReference(props);

  useMapOverlay<{}, PolylineProps>({
    registrySelector: (c) => c.markers, // reuse markers registry for now
    methods,
    props: preserved,
    eventListeners: {},
  });

  return null;
}
