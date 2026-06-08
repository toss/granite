import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useVisibility } from '../visibility';
import type { BackEvent } from './useBackEvent';
import { useBackEventContext } from './useBackEvent';

export type BackHandlerCallback = (event: BackEvent) => boolean | void;

export interface BackHandlerSubscription {
  remove: () => void;
}

export interface BackHandlerControls {
  addEventListener: (handler: BackHandlerCallback) => BackHandlerSubscription;
}

/**
 * @public
 * @category Screen Control
 * @name useBackHandler
 * @description
 * A Hook that registers back handlers. Back handlers run before handlers registered through `useBackEvent`.
 * Return `true` to stop bubbling and prevent default back navigation. Return `false` or return nothing to continue bubbling to the next handler.
 *
 * @example
 *
 * ### Example of Closing an Overlay First
 *
 * ```tsx
 * import { useEffect, useState } from 'react';
 * import { Button, View } from 'react-native';
 * import { useBackHandler } from '@granite-js/react-native';
 *
 * export function OverlayExample() {
 *   const backHandler = useBackHandler();
 *   const [isOverlayOpen, setIsOverlayOpen] = useState(false);
 *
 *   useEffect(() => {
 *     const subscription = backHandler.addEventListener(() => {
 *       if (isOverlayOpen) {
 *         setIsOverlayOpen(false);
 *         return true;
 *       }
 *
 *       return undefined;
 *     });
 *
 *     return () => {
 *       subscription.remove();
 *     };
 *   }, [backHandler, isOverlayOpen]);
 *
 *   return (
 *     <View>
 *       <Button title="Open Overlay" onPress={() => setIsOverlayOpen(true)} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useBackHandler() {
  const context = useBackEventContext();
  const handlersRef = useRef<Set<BackHandlerCallback>>(new Set()).current;

  const isVisible = useVisibility();

  const contextAddBackHandler = context.addBackHandler;
  const contextRemoveBackHandler = context.removeBackHandler;

  const removeHandler = useCallback(
    (...handlers: Array<BackHandlerCallback>) => {
      for (const handler of handlers) {
        handlersRef.delete(handler);
        contextRemoveBackHandler(handler);
      }
    },
    [contextRemoveBackHandler, handlersRef]
  );

  const addEventListener = useCallback(
    (handler: BackHandlerCallback) => {
      handlersRef.add(handler);
      contextAddBackHandler(handler);

      return {
        remove: () => removeHandler(handler),
      };
    },
    [contextAddBackHandler, handlersRef, removeHandler]
  );

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    for (const handler of handlersRef) {
      contextAddBackHandler(handler);
    }

    return () => {
      for (const handler of handlersRef) {
        contextRemoveBackHandler(handler);
      }
    };
  }, [contextAddBackHandler, contextRemoveBackHandler, handlersRef, isVisible]);

  const backHandler = useMemo((): BackHandlerControls => {
    return {
      addEventListener,
    };
  }, [addEventListener]);

  return backHandler;
}
