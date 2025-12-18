import type { NativeStackNavigationOptions } from '@granite-js/native/@react-navigation/native-stack';
import type { ComponentType } from 'react';

/**
 * @name Screen
 * @description A Screen that serves as a unit of navigation
 * @example
 *
 * ```ts
 * function Page() {
 *  // ...
 * }
 *
 * Page.screenOptions = {
 *   // ...
 * }
 * ```
 */
export type Screen = ComponentType & GraniteScreenOptions;

interface GraniteScreenOptions {
  /** @description Add this when customization is needed for NativeStack Screen's screenOptions */
  screenOptions?: NativeStackNavigationOptions;
}
