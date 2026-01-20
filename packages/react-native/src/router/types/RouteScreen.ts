import { NativeStackNavigationOptions } from '@granite-js/native/@react-navigation/native-stack';
import type { ErrorComponent } from './ErrorComponent';
import { Screen } from './Screen';

/**
 * @name RouteScreen
 */
export interface RouteScreen {
  /**
   * @name path
   * @description Path information (e.g. "/", "/list", "/list/:id", etc.)
   */
  path: string;
  /**
   * @name component
   * @description Screen component
   */
  component: Screen;
  /**
   * @name errorComponent
   * @description Error boundary component for this screen
   */
  errorComponent?: ErrorComponent;
  /**
   * @name screenOptions
   * @description Screen options for React Navigation (can be static or a function that receives route params)
   */
  screenOptions?: NativeStackNavigationOptions;
}
