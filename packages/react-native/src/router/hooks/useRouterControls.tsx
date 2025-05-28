import { NavigationContainer } from '@granite-js/native/@react-navigation/native';
import { useMemo, type ComponentProps, type ComponentType, type PropsWithChildren } from 'react';
import { getSchemeUri } from '../../native-modules';
import { StackNavigator } from '../components/StackNavigator';
import { RESERVED_KEYWORDS } from '../constants';
import { RequireContext } from '../types/RequireContext';
import { getRouteScreens, getScreenPathMapConfig } from '../utils';
import { createParentRouteScreenMap } from '../utils/createParentRouteScreenMap';
import { mergeParentLayoutScreen } from '../utils/mergeParentLayoutScreen';
import { getFileNameFromPath } from '../utils/path';

type NavigationContainerProps = ComponentProps<typeof NavigationContainer>;

export interface RouterControlsConfig {
  prefix: string;
  context: RequireContext;
  screenContainer?: ComponentType<PropsWithChildren<any>>;
}

export function useRouterControls({ prefix, context, screenContainer: ScreenContainer }: RouterControlsConfig) {
  const routeScreens = useMemo(() => getRouteScreens(context), [context]);

  const registerScreens = useMemo(() => {
    return routeScreens.filter(
      (screen) => !RESERVED_KEYWORDS.includes(getFileNameFromPath(screen.path, { withExtension: false }))
    );
  }, [routeScreens]);

  const layoutScreenMap = useMemo(() => createParentRouteScreenMap(routeScreens, '_layout'), [routeScreens]);

  const Screens = useMemo(() => {
    return registerScreens.map((routeScreen) => {
      const Layout = mergeParentLayoutScreen(layoutScreenMap, routeScreen.path);

      const Component = function Component() {
        const element = (
          <Layout>
            <routeScreen.component />
          </Layout>
        );

        return ScreenContainer == null ? element : <ScreenContainer>{element}</ScreenContainer>;
      };

      const routePath = routeScreen.path;
      const screenOptions = routeScreen.component?.screenOptions ?? {};

      return <StackNavigator.Screen key={routePath} name={routePath} component={Component} options={screenOptions} />;
    });
  }, [registerScreens, layoutScreenMap, ScreenContainer]);

  const linkingOptions: NavigationContainerProps['linking'] = useMemo(() => {
    return {
      prefixes: [prefix],
      config: {
        screens: getScreenPathMapConfig(registerScreens),
      },
      async getInitialURL() {
        const initialURL = getSchemeUri();

        if (initialURL == null) {
          return;
        }

        /** @NOTE Korean paths need to be decoded. */
        return decodeURI(initialURL);
      },
    };
  }, [prefix, registerScreens]);

  return { Screens, linkingOptions };
}
