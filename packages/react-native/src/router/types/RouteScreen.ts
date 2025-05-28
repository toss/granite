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
}
