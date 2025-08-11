import { NavigationContainerRefWithCurrent } from '@granite-js/native/@react-navigation/native';
import { useCallback, useMemo } from 'react';
import { useBackEventContext } from '../../use-back-event';

/**
 * @public
 * @name useRouterBackHandler
 * @category Screen Control
 * @description
 * A hook that provides a handler for handling back navigation actions. This can be used when you need to close a view directly when the back button is pressed in modals or independent screens where there's no navigation stack. This hook uses `NavigationContainerRef` from `@react-navigation/native` to navigate to the previous screen if there's a remaining navigation stack, or executes the user-defined `onClose` function if the stack is empty.
 *
 * @param {NavigationContainerRefWithCurrent<any>} navigationContainerRef - A `NavigationContainerRef` that can reference the current navigation state. Used when executing back navigation actions.
 * @param {() => void} [onClose] - A function to execute when the navigation stack is empty. For example, you can pass a function that closes a React Native View.
 *
 * @returns {{ handler: () => void }} A handler function that can be used in back buttons or similar components.
 *
 * @example
 *
 * ### Example of directly passing a handler to a back button and setting a function to close the view
 *
 * ```tsx
 * import { createNavigationContainerRef, useNavigation } from '@granite-js/native/@react-navigation/native';
 * import { BackButton, useRouterBackHandler } from '@granite-js/react-native';
 * import { useEffect } from 'react';
 *
 * const navigationContainerRef = createNavigationContainerRef();
 *
 * function MyBackButton() {
 *   const navigation = useNavigation();
 *
 *   const { handler } = useRouterBackHandler({
 *     navigationContainerRef,
 *     onClose: () => {
 *       // close the view
 *     },
 *   });
 *
 *   useEffect(() => {
 *     navigation.setOptions({
 *       headerLeft: () => <BackButton onPress={handler} />,
 *     });
 *   }, [handler, navigation]);
 *
 *   return <></>;
 * }
 */
export function useRouterBackHandler({
  navigationContainerRef,
  onClose,
}: {
  navigationContainerRef: NavigationContainerRefWithCurrent<any>;
  onClose?: () => void;
}) {
  const { handler } = useInternalRouterBackHandler({ navigationContainerRef, onClose });

  return { handler };
}

export function useInternalRouterBackHandler({
  navigationContainerRef,
  onClose,
}: {
  navigationContainerRef: NavigationContainerRefWithCurrent<any>;
  onClose?: () => void;
}) {
  const { hasBackEvent, onBack } = useBackEventContext();
  const canGoBack = !hasBackEvent;

  const handler = useCallback(() => {
    onBack?.();

    if (!canGoBack) {
      return;
    }

    if (navigationContainerRef.canGoBack()) {
      navigationContainerRef.goBack();
    } else {
      onClose?.();
    }
  }, [canGoBack, onClose, navigationContainerRef, onBack]);

  return useMemo(
    () => ({
      handler,
      canGoBack,
      onBack,
    }),
    [canGoBack, handler, onBack]
  );
}
