import { codegenNativeComponent, type ViewProps } from 'react-native';

// Fabric codegen requires a locally declared props interface, including for View-only components.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NativeProps extends ViewProps {}

export default codegenNativeComponent<NativeProps>('GranitePortalInitialContentView');
