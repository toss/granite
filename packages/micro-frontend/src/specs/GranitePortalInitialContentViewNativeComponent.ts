import { codegenNativeComponent, type ViewProps } from 'react-native';
import type { Int32, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';

interface NativeProps extends ViewProps {
  readonly initialContentKey?: string;
  readonly initialContentRevision?: WithDefault<Int32, 0>;
}

export default codegenNativeComponent<NativeProps>('GranitePortalInitialContentView');
