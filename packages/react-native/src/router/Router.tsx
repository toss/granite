import { HeaderBackButtonProps } from '@granite-js/native/@react-navigation/elements';
import {
  createNavigationContainerRef,
  NavigationContainer,
  NavigationContainerRefWithCurrent,
  ParamListBase,
  RouteProp,
} from '@granite-js/native/@react-navigation/native';
import { NativeStackNavigationOptions } from '@granite-js/native/@react-navigation/native-stack';
import { ComponentProps, ComponentType, Fragment, PropsWithChildren, ReactElement, useCallback, useMemo } from 'react';
import { InitialProps } from '..';
import { closeView } from '../native-modules';
import { BackButton } from './components/BackButton';
import { CanGoBackGuard } from './components/CanGoBackGuard';
import { StackNavigator } from './components/StackNavigator';
import { useInternalRouterBackHandler } from './components/useRouterBackHandler';
import { useInitialRouteName } from './hooks/useInitialRouteName';
import { useRouterControls, type RouterControlsConfig } from './hooks/useRouterControls';
import { RequireContext } from './types';
import { BASE_STACK_NAVIGATOR_STYLE } from './types/screen-option';

/**
 * @internal
 */
export interface InternalRouterProps {
  /**
   * @name context
   * @description
   * Object containing screen information used for file-based routing.
   */
  context: RequireContext;
  /**
   * @name prefix
   * @description
   * Prefix to use when the scheme is executed. For example, to enter 'scheme://my-service/intro', you need to set 'scheme://my-service' as the prefix.
   */
  prefix: string;
  /**
   * @name canGoBack
   * @description
   * Whether navigation back is possible. Default is true, and when set to true, you can use the back gesture or back button from @react-navigation/native.
   * @default true
   */
  canGoBack?: boolean;
  /**
   * @name onBack
   * @description
   * Callback function called when navigating back.
   */
  onBack?: () => void;
  /**
   * @name container
   * @description
   * Container component that wraps the Navigator from @react-navigation/native.
   */
  container: ComponentType<PropsWithChildren<InitialProps>>;
  initialProps: InitialProps;
  initialScheme: string;
  setIosSwipeGestureEnabled?: ({ isEnabled }: { isEnabled: boolean }) => Promise<void> | void;
  getInitialUrl?: RouterControlsConfig['getInitialUrl'];
}

export type RouterProps = StackNavigatorProps & NavigationContainerProps;

interface StackNavigatorProps {
  /**
   * @name navigationContainerRef
   * @description
   * You can create and pass a NavigationContainerRef from @react-navigation/native externally. This allows external control of the router.
   */
  navigationContainerRef?: NavigationContainerRefWithCurrent<any>;
  /**
   * @name defaultScreenOption
   * @description
   * Default options for screens. You can set options to be applied commonly to screens, such as title or headerStyle.
   */
  defaultScreenOption?:
    | NativeStackNavigationOptions
    | ((props: { route: RouteProp<ParamListBase>; navigation: any }) => NativeStackNavigationOptions);
  /**
   * @name screenContainer
   * @description
   * Container component that wraps each Screen component.
   */
  screenContainer?: ComponentType<PropsWithChildren<any>>;
}

type NavigationContainerProps = Pick<
  ComponentProps<typeof NavigationContainer>,
  'ref' | 'documentTitle' | 'fallback' | 'onReady' | 'onUnhandledAction' | 'onStateChange' | 'initialState'
>;

/**
 * @category Components
 * @kind function
 * @name Router
 * @description
 * Router component for page navigation in React Native environment.
 * Automatically assigns appropriate paths to screens based on file naming rules in pages/*.
 * Using this component, you can manage screens in a way similar to Next.js's file-based routing.
 *
 * @param {string} prefix Prefix to use when the scheme is executed. For example, to enter 'scheme://my-service/intro', you need to set 'scheme://my-service' as the prefix.
 * @param {RequireContext} context Object containing information about screens for file-based routing.
 * @param {NavigationContainerRefWithCurrent<any>} [navigationContainerRef] You can create and pass a NavigationContainerRef from @react-navigation/native externally. This allows external control of the router.
 * @param {NativeStackNavigationOptions | ((props: { route: RouteProp<ParamListBase>; navigation: any }) => NativeStackNavigationOptions)} [defaultScreenOption] Default options for screens. You can set options to be applied commonly to screens, such as title or headerStyle.
 * @param {boolean} [canGoBack=true] Whether navigation back is possible. Default is true, and when set to true, you can use the back gesture or back button from @react-navigation/native.
 * @param {() => void} [onBack] Callback function called when the user presses the back button or uses the back gesture. For example, you can set it to log when the user presses the back button.
 * @param {ComponentType<{ children: ReactNode }>} [container=Fragment] Container component that wraps the Navigator from @react-navigation/native.
 * @param {NavigationContainerProps} [navigationContainerProps] - You can set props to be passed to NavigationContainer from @react-navigation/native.
 *
 * @returns {ReactElement} - Returns the router component.
 * @example
 * ```tsx
 * import { Router } from '@granite-js/react-native';
 * import { context } from '../require.context';
 *
 * function App() {
 *  return <Router context={context} prefix={'scheme://testbench'} />;
 * }
 * ```
 */
export function Router({
  // Internal props
  prefix,
  context,
  container: Container = Fragment,
  initialProps,
  initialScheme,
  // Public props (NavigationContainer)
  navigationContainerRef,
  defaultScreenOption,
  screenContainer,
  // Public props (StackNavigator)
  setIosSwipeGestureEnabled,
  getInitialUrl,
  ...navigationContainerProps
}: InternalRouterProps & RouterProps): ReactElement {
  const initialRouteName = useInitialRouteName({ prefix, initialScheme });
  const { Screens, linkingOptions } = useRouterControls({
    prefix,
    context,
    screenContainer,
    initialScheme,
    getInitialUrl,
  });

  const ref = useMemo(() => navigationContainerRef ?? createNavigationContainerRef<any>(), [navigationContainerRef]);

  const { handler, canGoBack, onBack } = useInternalRouterBackHandler({
    navigationContainerRef: ref,
    onClose: closeView,
  });

  const headerLeft = useCallback(
    (backButtonProps: HeaderBackButtonProps) => <BackButton {...backButtonProps} onPress={handler} />,
    [handler]
  );

  const screenOptions = useCallback(
    (screenProps: any) => ({
      ...BASE_STACK_NAVIGATOR_STYLE,
      gestureEnabled: canGoBack,
      headerLeft,
      ...(typeof defaultScreenOption === 'function' ? defaultScreenOption(screenProps) : defaultScreenOption),
    }),
    [canGoBack, defaultScreenOption, headerLeft]
  );

  return (
    <NavigationContainer ref={ref} {...navigationContainerProps} linking={linkingOptions}>
      <CanGoBackGuard canGoBack={canGoBack} onBack={onBack} setIosSwipeGestureEnabled={setIosSwipeGestureEnabled}>
        <Container {...initialProps}>
          <StackNavigator.Navigator initialRouteName={initialRouteName} screenOptions={screenOptions}>
            {Screens}
          </StackNavigator.Navigator>
        </Container>
      </CanGoBackGuard>
    </NavigationContainer>
  );
}
