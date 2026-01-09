import { useEffect, useLayoutEffect } from 'react';
import type { View } from 'react-native';
import { type MapContextValue, useMapContext } from './context';
import { useOverlayId } from './id';

interface MapOverlayProps<EventListeners, Props> {
  registrySelector: (c: MapContextValue) => Map<string, Partial<EventListeners>>;
  methods: MapOverlayMethods<Props>;
  props: Props;
  eventListeners: Partial<EventListeners>;
}

interface MapOverlayMethods<Props> {
  add: (v: View, id: string, args: Props) => void;
  update: (v: View, id: string, args: Props) => void;
  remove: (v: View, id: string) => void;
}

export function useMapOverlay<EventListeners, Props>({
  props,
  eventListeners,
  methods,
  registrySelector,
}: MapOverlayProps<EventListeners, Props>) {
  const id = useOverlayId();
  const mapContext = useMapContext();

  useEffect(() => {
    if (!mapContext) {
      return;
    }

    const registry = registrySelector(mapContext);
    registry.set(id, eventListeners);
    return () => {
      registry.delete(id);
    };
  }, [id, mapContext, registrySelector, eventListeners]);

  useLayoutEffect(() => {
    console.log('[useMapOverlay] useLayoutEffect - mapContext:', mapContext ? 'exists' : 'null', 'id:', id);
    if (!mapContext) {
      return;
    }

    const { mapView } = mapContext;
    console.log('[useMapOverlay] calling methods.add for id:', id);
    methods.add(mapView, id, props);
    return () => methods.remove(mapView, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mapContext, methods]);

  useLayoutEffect(() => {
    if (!mapContext) {
      return;
    }
    methods.update(mapContext.mapView, id, props);
  }, [id, mapContext, methods, props]);
}
