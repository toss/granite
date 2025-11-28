import { NativeStackNavigationOptions } from '@granite-js/native/@react-navigation/native-stack';
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
   * @name screenOptions
   * @description Screen options for React Navigation (can be static or a function that receives route params)
   */
  screenOptions?: NativeStackNavigationOptions;
}
