declare module 'react-native/Libraries/Types/CodegenTypes' {
  export type WithDefault<T, Default> = T | Default;
  export type Int32 = number;
  export type Double = number;
  export type Float = number;
  export type DirectEventHandler<T> = (event: {nativeEvent: T}) => void;
  export type BubblingEventHandler<T> = (event: {nativeEvent: T}) => void;
}

declare module 'react-native/Libraries/Utilities/codegenNativeComponent' {
  import type {HostComponent} from 'react-native';
  export default function codegenNativeComponent<Props>(
    componentName: string,
    options?: {
      interfaceOnly?: boolean;
      paperComponentName?: string;
      paperComponentNameDeprecated?: string;
      excludedPlatforms?: ReadonlyArray<'iOS' | 'android'>;
    },
  ): HostComponent<Props>;
}
