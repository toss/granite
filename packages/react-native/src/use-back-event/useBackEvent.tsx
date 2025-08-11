import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useVisibility } from '../visibility';

export interface BackEventControls {
  addEventListener: (...handlers: Array<() => void>) => void;
  removeEventListener: (...handlers: Array<() => void>) => void;
}

interface PrivateBackEventControls extends BackEventControls {
  handlersRef: Set<() => void>;
  hasBackEvent: boolean;
  onBack: () => void;
}

const BackEventContext = createContext<PrivateBackEventControls | null>(null);

/**
 * @component
 * @name BackEventProvider
 * @description
 * A component that provides a `Context` for handling back events within the app. Using this component, child components can subscribe to and manage back events. Placing `BackEventProvider` at the top of the tree allows all back events to be handled centrally.
 *
 * @param {ReactNode} children Child components that will control back events.
 * @param {BackEventControls} backEvent Control object for handling back events. You can register back events using the `addEventListener` method and remove registered back events using the `removeEventListener` method.
 * @returns {JSX.Element} A component that can handle back events.
 *
 * By adding `BackEventProvider` as shown below, child components can handle back events.
 *
 * @example
 * ```jsx
 * const backEventControls = {
 *   addEventListener: (handler) => { ... },
 *   removeEventListener: (handler) => { ... },
 * };
 *
 * <BackEventProvider backEvent={backEventControls}>
 *   <App />
 * </BackEventProvider>
 * ```
 */
export function BackEventProvider({ children }: { children: ReactNode }) {
  const backEventState = useBackEventState();

  return <BackEventContext.Provider value={backEventState}>{children}</BackEventContext.Provider>;
}

/**
 * @name useBackEventState
 * @description
 * A hook that returns the current back event state and control methods managed by `BackEventProvider`. Using this hook, you can add or remove back event handlers and check the current state.
 *
 * @returns {{ handlers: Array<() => void>, backEvent: BackEventControls, routerProps: { canGoBack: boolean, onBack: () => void } }} Returns an array of back event handlers, the event control method `backEvent`, and `routerProps` that can be used when handling back functionality in the router.
 *
 * Using this Hook, you can add or remove back event handlers and integrate with the router.
 *
 * @example
 * ```javascript
 * const { backEvent, routerProps } = useBackEventState();
 * // Handle back events in the router through routerProps
 * backEvent.addEventListener(() => {
 *   console.log('Back event triggered');
 * });
 *
 * return (
 *   <BackEventProvider backEvent={backEvent}>
 *     <GraniteRouter {...routerProps} context={context} prefix={'scheme://testbench'} />
 *   </BackEventProvider>
 * );
 *
 * ```
 */
export function useBackEventState() {
  const handlersRef = useRef<Set<() => void>>(new Set()).current;
  const [hasBackEvent, setHasBackEvent] = useState(false);

  const addEventListener = useCallback(
    (...handlers: Array<() => void>) => {
      for (const handler of handlers) {
        handlersRef.add(handler);
      }

      if (handlersRef.size > 0) {
        setHasBackEvent(true);
      }
    },
    [handlersRef]
  );

  const removeEventListener = useCallback(
    (...handlers: Array<() => void>) => {
      for (const handler of handlers) {
        handlersRef.delete(handler);
      }

      if (handlersRef.size === 0) {
        setHasBackEvent(false);
      }
    },
    [handlersRef]
  );

  const backEvent = useMemo((): PrivateBackEventControls => {
    return {
      addEventListener,
      removeEventListener,
      handlersRef,
      hasBackEvent,
      onBack: () => {
        handlersRef.forEach((handler) => handler());
      },
    };
  }, [addEventListener, handlersRef, hasBackEvent, removeEventListener]);

  return backEvent;
}

/**
 * @public
 * @category Screen Control
 * @name useBackEvent
 * @description
 * A Hook that returns a controller object for registering and removing back events. Using this Hook, you can handle back events only when a specific component is active.
 * Use `addEventListener` to register back events and `removeEventListener` to remove them.
 * Registered back events are only active when the user is viewing the screen. The condition for viewing the screen is determined using [useVisibility](/en/reference/react-native/Screen%20Control/useVisibility).
 *
 * Using this Hook, you can define logic to handle back events in specific components.
 *
 * @returns {BackEventControls} An object that can control back events. This object includes the `addEventListener` method for registering events and the `removeEventListener` method for removing them.
 *
 * @throws {Error} Throws an error if this hook is not used within a `BackEventProvider`.
 *
 * @example
 *
 * ### Example of Registering and Removing Back Events
 *
 * - **When the "Add BackEvent" button is pressed, a back event is registered.** After that, pressing the back button shows an alert with "back" and prevents actual navigation.
 * - **When the "Remove BackEvent" button is pressed, the registered event is removed.** After that, pressing the back button navigates back normally as per default behavior.
 *
 * ```tsx
 * import { useEffect, useState } from 'react';
 * import { Alert, Button, View } from 'react-native';
 * import { useBackEvent } from '@granite-js/react-native';
 *
 * export function UseBackEventExample() {
 *   const backEvent = useBackEvent();
 *
 *   const [handler, setHandler] = useState<{ callback: () => void } | undefined>(undefined);
 *
 *   useEffect(() => {
 *     const callback = handler?.callback;
 *
 *     if (callback != null) {
 *       backEvent.addEventListener(callback);
 *
 *       return () => {
 *         backEvent.removeEventListener(callback);
 *       };
 *     }
 *
 *     return;
 *   }, [backEvent, handler]);
 *
 *   return (
 *     <View>
 *       <Button
 *         title="Add BackEvent"
 *         onPress={() => {
 *           setHandler({ callback: () => Alert.alert('back') });
 *         }}
 *       />
 *       <Button
 *         title="Remove BackEvent"
 *         onPress={() => {
 *           setHandler(undefined);
 *         }}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useBackEvent() {
  const context = useContext(BackEventContext);
  const handlersRef = useRef<Set<() => void>>(new Set()).current;

  const isVisible = useVisibility();

  if (context == null) {
    throw new Error('useBackEvent must be used within a BackEventProvider');
  }

  const contextAddEventListener = context.addEventListener;
  const contextRemoveEventListener = context.removeEventListener;

  const addEventListener = useCallback(
    (...handlers: Array<() => void>) => {
      for (const handler of handlers) {
        handlersRef.add(handler);
        contextAddEventListener(handler);
      }
    },
    [contextAddEventListener, handlersRef]
  );

  const removeEventListener = useCallback(
    (...handlers: Array<() => void>) => {
      for (const handler of handlers) {
        handlersRef.delete(handler);
        contextRemoveEventListener(handler);
      }
    },
    [contextRemoveEventListener, handlersRef]
  );

  /**
   * Events must be removed when navigating to another page.
   * If events are not removed, interference will occur.
   */
  useEffect(() => {
    if (!isVisible) {
      return;
    }

    /** Re-register handlers stored locally. */
    for (const handler of handlersRef) {
      contextAddEventListener(handler);
    }

    return () => {
      for (const handler of handlersRef) {
        contextRemoveEventListener(handler);
      }
    };
  }, [contextAddEventListener, contextRemoveEventListener, handlersRef, isVisible]);

  const backEvent = useMemo((): BackEventControls => {
    return {
      addEventListener,
      removeEventListener,
    };
  }, [addEventListener, removeEventListener]);

  return backEvent;
}

export function useBackEventContext() {
  const context = useContext(BackEventContext);
  if (context == null) {
    throw new Error('useBackEvent must be used within a BackEventProvider');
  }

  return context;
}
