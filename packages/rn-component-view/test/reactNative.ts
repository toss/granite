const absoluteFillObject = {
  bottom: 0,
  left: 0,
  position: 'absolute',
  right: 0,
  top: 0,
};

export const StyleSheet = {
  absoluteFill: absoluteFillObject,
  absoluteFillObject,
  create: <TStyles>(styles: TStyles) => styles,
};

export const View = 'View';

export const AppRegistry = {
  registerComponent: (appKey: string) => appKey,
};

export function useWindowDimensions() {
  return { fontScale: 1, height: 844, scale: 3, width: 390 };
}

// The native module is missing unless a test mocks it.
export const TurboModuleRegistry = {
  get: () => null,
};
