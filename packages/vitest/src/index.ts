import { reactNative, resolveReactNativeSetupFiles } from './reactNative';

interface ExportedPackage {
  reactNative: typeof reactNative;
  resolveReactNativeSetupFiles: typeof resolveReactNativeSetupFiles;
}

const exportedPackage: ExportedPackage = {
  reactNative,
  resolveReactNativeSetupFiles,
};

export * from './reactNative';
export default exportedPackage;
