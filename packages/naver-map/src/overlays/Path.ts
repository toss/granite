import { type View } from 'react-native';
import { useMapOverlay } from '../internals/useMapOverlay';
import { usePreservedReference } from '../internals/usePreservedReference';
import { processColorInput } from '../internals/colorUtils';
import type { Coord } from '../types/Coord';
import { Commands } from '../specs/RNNaverMapViewNativeComponent';

export interface PathProps {
  coordinates: Coord[];
  color?: number | string;
  outlineColor?: number | string;
  passedColor?: number | string;
  passedOutlineColor?: number | string;
  width?: number;
  outlineWidth?: number;
  patternImage?: string;
  patternInterval?: number;
  progress?: number;
  zIndex?: number;
}

const add = (v: View, id: string, args: PathProps) => {
  const color = processColorInput(args.color, 0xFF000000);
  const outlineColor = processColorInput(args.outlineColor, 0xFFFFFFFF);
  const passedColor = processColorInput(args.passedColor, 0xFF808080);
  const passedOutlineColor = processColorInput(args.passedOutlineColor, 0xFFFFFFFF);
  const coordsJson = JSON.stringify(args.coordinates);

  Commands.addPath(
    v as any,
    id,
    coordsJson,
    args.width ?? 5,
    args.outlineWidth ?? 1,
    color,
    outlineColor,
    passedColor,
    passedOutlineColor,
    args.patternImage ?? '',
    args.patternInterval ?? 0,
    args.progress ?? 0,
    args.zIndex ?? 0
  );
};

const update = (v: View, id: string, args: PathProps) => {
  const color = processColorInput(args.color, 0xFF000000);
  const outlineColor = processColorInput(args.outlineColor, 0xFFFFFFFF);
  const passedColor = processColorInput(args.passedColor, 0xFF808080);
  const passedOutlineColor = processColorInput(args.passedOutlineColor, 0xFFFFFFFF);
  const coordsJson = JSON.stringify(args.coordinates);

  Commands.updatePath(
    v as any,
    id,
    coordsJson,
    args.width ?? 5,
    args.outlineWidth ?? 1,
    color,
    outlineColor,
    passedColor,
    passedOutlineColor,
    args.patternImage ?? '',
    args.patternInterval ?? 0,
    args.progress ?? 0,
    args.zIndex ?? 0
  );
};

const remove = (v: View, id: string) => {
  Commands.removePath(v as any, id);
};

const methods = { add, update, remove };

export function Path(props: PathProps) {
  const preserved = usePreservedReference(props);

  useMapOverlay<{}, PathProps>({
    registrySelector: (c) => c.markers,
    methods,
    props: preserved,
    eventListeners: {},
  });

  return null;
}
