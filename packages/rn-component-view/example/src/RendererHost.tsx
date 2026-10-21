import { RNComponentViewRenderer } from '@granite-js/rn-component-view';

/**
 * The root of the surface the native app starts for the renderer. It draws the component of every RNComponentView into
 * the Portal host inside that view, so the surface itself shows nothing.
 */
export function RendererHost() {
  return <RNComponentViewRenderer />;
}
