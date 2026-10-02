import type { ComponentType } from 'react';

export const StyleSheet = {
  absoluteFillObject: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  create: <TStyles>(styles: TStyles) => styles,
};

export const View = 'View';

export const TurboModuleRegistry = {
  getEnforcing: () => ({}),
};

export function codegenNativeComponent<TProps>(name: string) {
  return name as unknown as ComponentType<TProps>;
}
