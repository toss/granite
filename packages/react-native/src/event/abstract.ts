export abstract class GraniteEventDefinition<O = undefined, R = void> {
  // Event name (literal type recommended)
  abstract name: string;

  /**
   * Method to implement event logic.
   * @param options - Event options (undefined if not used)
   * @param onEvent - Callback called when the event is triggered.
   * @param onError - Callback called on error (error type: unknown)
   */
  abstract listener(options: O, onEvent: (response: R) => void, onError: (error: unknown) => void): void;

  /**
   * Additional logic to execute when removing the event listener.
   * If needed in the plugin, override this method and it will be called
   * when the listener is removed.
   */
  abstract remove(): void;
}

/**
 * GraniteEvent class registers event definition instances passed to the constructor.
 * The addEventListener method only allows registered event names, and the types of passed
 * options/callbacks are automatically inferred.
 *
 * Each subscription is uniquely identified by (event name + options).
 */
export class GraniteEvent<Defs extends GraniteEventDefinition<unknown, unknown>> {
  private definitions = new Map<Defs['name'], Defs>();
  private subscriptionGroups = new Map<
    string,
    {
      eventName: Defs['name'];
      options: Extract<Defs, { name: Defs['name'] }> extends GraniteEventDefinition<infer O, any> ? O : never;
      callbacks: Array<{
        onEvent: (response: any) => void;
        onError?: (error: unknown) => void;
      }>;
    }
  >();

  constructor(defs: Defs[]) {
    for (const def of defs) {
      this.definitions.set(def.name, def);
    }
  }

  addEventListener<E extends Defs['name']>(
    eventName: E,
    listener: Extract<Defs, { name: E }> extends GraniteEventDefinition<infer O, infer R>
      ? [O] extends [undefined]
        ? { onEvent: (response: R) => void; onError?: (error: unknown) => void }
        : { options: O; onEvent: (response: R) => void; onError?: (error: unknown) => void }
      : never
  ): () => void {
    const def = this.definitions.get(eventName);
    if (!def) {
      throw new Error(`Event "${String(eventName)}" is not registered.`);
    }
    const opts = (listener as any).options;
    const key = this._getKey(String(eventName), opts);
    let group = this.subscriptionGroups.get(key);

    if (!group) {
      group = {
        eventName,
        options: opts,
        callbacks: [],
      };
      this.subscriptionGroups.set(key, group);

      const aggregatedOnEvent = (response: any) => {
        for (const cb of group!.callbacks) {
          cb.onEvent(response);
        }
      };
      const aggregatedOnError = (error: unknown) => {
        for (const cb of group!.callbacks) {
          if (cb.onError) {
            cb.onError(error);
          }
        }
      };

      def.listener(group.options, aggregatedOnEvent, aggregatedOnError);
    }

    group.callbacks.push({ onEvent: listener.onEvent, onError: listener.onError });

    return () => {
      const grp = this.subscriptionGroups.get(key);
      if (!grp) {
        return;
      }
      grp.callbacks = grp.callbacks.filter((cb) => cb.onEvent !== listener.onEvent);
      if (grp.callbacks.length === 0) {
        def.remove();
        this.subscriptionGroups.delete(key);
      }
    };
  }

  emit<E extends Defs['name']>(
    eventName: E,
    data: Extract<Defs, { name: E }> extends GraniteEventDefinition<unknown, infer R> ? R : never
  ) {
    const def = this.definitions.get(eventName);
    if (!def) {
      throw new Error(`Event "${String(eventName)}" is not registered.`);
    }

    for (const group of this.subscriptionGroups.values()) {
      if (group.eventName === eventName) {
        for (const callback of group.callbacks) {
          try {
            callback.onEvent(data);
          } catch (error) {
            if (callback.onError) {
              callback.onError(error);
            }
          }
        }
      }
    }
  }

  private _getKey(eventName: string, options: unknown): string {
    return `${eventName}:${options ? JSON.stringify(options) : ''}`;
  }
}
