import type { ParamListBase, RouteProp } from '@granite-js/native/@react-navigation/native';
import type { NativeStackNavigationOptions } from '@granite-js/native/@react-navigation/native-stack';
import { assertType, describe, it } from 'vitest';
import type { RouterProps } from './Router';

describe('Router screen option configuration', () => {
  it('infers routeIndex and onBack for the plural option', () => {
    assertType<RouterProps>({
      defaultScreenOptions: ({ routeIndex, onBack }) => {
        assertType<number>(routeIndex);
        assertType<() => void>(onBack);
        return { title: `Route ${routeIndex}` };
      },
    });
  });

  it('preserves the indexed legacy type for wrappers that resolve the original callback', () => {
    type LegacyResolver =
      | NativeStackNavigationOptions
      | ((props: { route: RouteProp<ParamListBase>; navigation: any }) => NativeStackNavigationOptions);
    const options: RouterProps['defaultScreenOption'] = ({ route }) => ({ title: route.name });
    assertType<LegacyResolver>(options);
    assertType<RouterProps>({ defaultScreenOption: options });
  });

  it('rejects specifying both option names', () => {
    // @ts-expect-error Only one option name may be configured.
    assertType<RouterProps>({ defaultScreenOptions: {}, defaultScreenOption: {} });
  });
});
