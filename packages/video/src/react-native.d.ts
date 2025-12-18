declare module 'react-native/Libraries/Types/CodegenTypes' {
  export type Int32 = number;
  export type Float = number;
  export type Double = number;
  export type UnsafeObject = object;

  export type WithDefault<T, Default> = T | undefined;

  export type DirectEventHandler<T, PaperName extends string = ''> = (
    event: T extends null ? { nativeEvent: {} } : { nativeEvent: T }
  ) => void;

  export type BubblingEventHandler<T, PaperName extends string = ''> = (
    event: T extends null ? { nativeEvent: {} } : { nativeEvent: T }
  ) => void;
}

declare module 'react-native/Libraries/Utilities/codegenNativeComponent' {
  import type { HostComponent } from 'react-native';

  export default function codegenNativeComponent<Props extends object>(
    componentName: string,
    options?: {
      interfaceOnly?: boolean;
      paperComponentName?: string;
      paperComponentNameDeprecated?: string;
      excludedPlatforms?: ReadonlyArray<'iOS' | 'android'>;
    }
  ): HostComponent<Props>;
}

declare module 'react-native/Libraries/Utilities/codegenNativeCommands' {
  export default function codegenNativeCommands<T extends object>(options: {
    supportedCommands: ReadonlyArray<keyof T>;
  }): T;
}
