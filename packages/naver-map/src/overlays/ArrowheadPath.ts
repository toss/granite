import { type View } from 'react-native';
import { processColorInput } from '../internals/colorUtils';
import { useMapOverlay } from '../internals/useMapOverlay';
import { usePreservedReference } from '../internals/usePreservedReference';
import { Commands } from '../specs/GraniteNaverMapViewNativeComponent';
import type { Coord } from '../types/Coord';

export interface ArrowheadPathProps {
  coordinates: Coord[];
  color?: number | string;
  outlineColor?: number | string;
  width?: number;
  outlineWidth?: number;
  headSizeRatio?: number;
  zIndex?: number;
}

const add = (v: View, id: string, args: ArrowheadPathProps) => {
  const color = processColorInput(args.color, 0xff000000);
  const outlineColor = processColorInput(args.outlineColor, 0xffffffff);
  const coordsJson = JSON.stringify(args.coordinates);

  Commands.addArrowheadPath(
    v as any,
    id,
    coordsJson,
    args.width ?? 5,
    args.outlineWidth ?? 1,
    color,
    outlineColor,
    args.headSizeRatio ?? 3,
    args.zIndex ?? 0
  );
};

const update = (v: View, id: string, args: ArrowheadPathProps) => {
  const color = processColorInput(args.color, 0xff000000);
  const outlineColor = processColorInput(args.outlineColor, 0xffffffff);
  const coordsJson = JSON.stringify(args.coordinates);

  Commands.updateArrowheadPath(
    v as any,
    id,
    coordsJson,
    args.width ?? 5,
    args.outlineWidth ?? 1,
    color,
    outlineColor,
    args.headSizeRatio ?? 3,
    args.zIndex ?? 0
  );
};

const remove = (v: View, id: string) => {
  Commands.removeArrowheadPath(v as any, id);
};

const methods = { add, update, remove };

export function ArrowheadPath(props: ArrowheadPathProps) {
  const preserved = usePreservedReference(props);

  useMapOverlay<object, ArrowheadPathProps>({
    registrySelector: (c) => c.markers,
    methods,
    props: preserved,
    eventListeners: {},
  });

  return null;
}
