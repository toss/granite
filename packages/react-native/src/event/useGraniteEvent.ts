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
    this.backEventControls.addEventListener(onEvent);
    this.ref.remove = () => this.backEventControls.removeEventListener(onEvent);
  }
}

export function useGraniteEvent() {
  const backEvent = useBackEvent();

  const event = useMemo(() => {
    return new GraniteEvent([new BackEvent(backEvent)]);
  }, [backEvent]);

  return event;
}
