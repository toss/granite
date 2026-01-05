import { type View } from 'react-native';
import { useMapOverlay } from '../internals/useMapOverlay';
import { usePreservedReference } from '../internals/usePreservedReference';
import { processColorInput } from '../internals/colorUtils';
import type { Coord } from '../types/Coord';
import { Commands } from '../specs/GraniteNaverMapViewNativeComponent';

export interface CircleProps {
  center: Coord;
  radius: number;
  fillColor?: number | string;
  strokeColor?: number | string;
  strokeWidth?: number;
  zIndex?: number;
}

const add = (v: View, id: string, args: CircleProps) => {
  const fillColor = processColorInput(args.fillColor, 0x80000000);
  const strokeColor = processColorInput(args.strokeColor, 0xFF000000);

  Commands.addCircle(
    v as any,
    id,
    args.center.latitude,
    args.center.longitude,
    args.radius,
    fillColor,
    strokeColor,
    args.strokeWidth ?? 0,
    args.zIndex ?? 0
  );
};

const update = (v: View, id: string, args: CircleProps) => {
  const fillColor = processColorInput(args.fillColor, 0x80000000);
  const strokeColor = processColorInput(args.strokeColor, 0xFF000000);

  Commands.updateCircle(
    v as any,
    id,
    args.center.latitude,
    args.center.longitude,
    args.radius,
    fillColor,
    strokeColor,
    args.strokeWidth ?? 0,
    args.zIndex ?? 0
  );
};

const remove = (v: View, id: string) => {
  Commands.removeCircle(v as any, id);
};

const methods = { add, update, remove };

export function Circle(props: CircleProps) {
  const preserved = usePreservedReference(props);

  useMapOverlay<{}, CircleProps>({
    registrySelector: (c) => c.markers,
    methods,
    props: preserved,
    eventListeners: {},
  });

  return null;
}
