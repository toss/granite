import { createContext, PropsWithChildren, ReactElement, useContext, useEffect, useState } from 'react';
import { nativeEventEmitter } from '../native-event-emitter';

const VisibilityChangedContext = createContext<boolean | undefined>(undefined);

/**
 * @name VisibilityChangedProvider
 * @kind function
 * @description
 * A Provider that manages whether a React Native screen is visible.
 * It subscribes to the app's `visibilityChanged` event to detect and manage screen visibility.
 *
 * @param {ReactNode | undefined} children - Child components that check screen visibility.
 * @param {boolean} isVisible - A boolean value indicating whether the screen is visible.
 * @returns {ReactElement} - A React Provider component wrapped with `VisibilityChangedContext.Provider`.
 * @example
 * ```typescript
 * export function VisibilityProvider({ isVisible, children }: Props) {
 *   return (
 *     <VisibilityChangedProvider isVisible={isVisible}>
 *       {children}
 *     </VisibilityChangedProvider>
 *   );
 * }
 * ```
 */
export function VisibilityChangedProvider({
  children,
  isVisible,
}: PropsWithChildren<{ isVisible: boolean }>): ReactElement {
  const [visible, setVisible] = useState(isVisible);

  useEffect(() => {
    const subscription = nativeEventEmitter.addListener('visibilityChanged', (nextVisible) => {
      setVisible(nextVisible);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <VisibilityChangedContext.Provider value={visible}>{children}</VisibilityChangedContext.Provider>;
}

/**
 * @name useVisibilityChanged
 * @category Hooks
 * @kind function
 * @description
 * A Hook that returns whether a React Native screen is visible.
 * @returns {boolean} - Returns whether the screen is visible.
 * @throws {Error} Throws an error when not used within a `VisibilityChangedProvider`.
 * @example
 * ```typescript
 * const isVisible = useVisibilityChanged();
 * console.log(isVisible);
 * // true or false
 * ```
 */
export function useVisibilityChanged(): boolean {
  const isVisible = useContext(VisibilityChangedContext);

  if (isVisible == null) {
    throw new Error('useVisibilityChanged must be used within a VisibilityChangedProvider');
  }

  return isVisible;
}
