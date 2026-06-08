import { useMemo } from 'react';
import { GraniteEvent, GraniteEventDefinition } from './abstract';
import { BackEventControls, useBackEvent } from '../use-back-event/useBackEvent';

class BackEvent extends GraniteEventDefinition<void, void> {
  name = 'backEvent' as const;

  ref = {
    remove: () => {},
  };

  constructor(private backEventControls: BackEventControls) {
    super();
  }

  remove() {
    this.ref.remove();
  }

  listener(_: void, onEvent: (response: void) => void): void {
    const handler = () => onEvent(undefined);

    this.backEventControls.addEventListener(handler);
    this.ref.remove = () => this.backEventControls.removeEventListener(handler);
  }
}

export function useGraniteEvent() {
  const backEvent = useBackEvent();

  const event = useMemo(() => {
    return new GraniteEvent([new BackEvent(backEvent)]);
  }, [backEvent]);

  return event;
}
