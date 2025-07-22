import { ReportableEvent } from "../vendors/metro/src/lib/ReportableEvent";

type Untyped = any;

interface PackageJson {
  readonly name?: string;
  readonly main?: string;
  readonly exports?: string | Untyped;
}

interface PackageInfo {
  readonly packageJson: PackageJson;
  readonly rootPath: string;
}

type ResolveAsset = (dirPath: string, assetName: string, extension: string) => string[] | undefined;

interface ResolutionContext {
  readonly assetExts: string[];
  readonly allowHaste: boolean;
  readonly customResolverOptions: Untyped;
  readonly disableHierarchicalLookup: boolean;
  readonly doesFileExist: Untyped;
  readonly extraNodeModules?: { [key: string]: string };
  readonly getPackage: (packageJsonPath: string) => PackageJson | null;
  readonly getPackageForModule: (modulePath: string) => PackageInfo | null;
  readonly dependency?: any;
  readonly mainFields: string[];
  readonly originModulePath: string;
  readonly nodeModulesPaths: string[];
  readonly preferNativePlatform: boolean;
  readonly resolveAsset: ResolveAsset;
  readonly redirectModulePath: (modulePath: string) => string | false;
  readonly resolveHasteModule: (name: string) => string | undefined;
  readonly resolveHastePackage: (name: string) => string | undefined;
  readonly resolveRequest?: CustomResolver;
  readonly sourceExts: string[];
  readonly unstable_conditionsByPlatform: {
    [platform: string]: string[];
  };
  unstable_conditionNames: string[];
  unstable_enablePackageExports: boolean;
  unstable_getRealPath?: any;
  unstable_logWarning: (message: string) => void;
}

export interface CustomResolutionContext extends ResolutionContext {
  readonly resolveRequest: CustomResolver;
}

type CustomResolver = (context: CustomResolutionContext, moduleName: string, platform: string | null) => any;

interface ResolverConfig {
  assetExts: string[];
  assetResolutions: string[];
  blacklistRE?: RegExp | RegExp[];
  blockList: RegExp | RegExp[];
  dependencyExtractor?: string;
  disableHierarchicalLookup: boolean;
  extraNodeModules: { [name: string]: string };
  emptyModulePath: string;
  enableGlobalPackages: boolean;
  hasteImplModulePath?: string;
  nodeModulesPaths: string[];
  platforms: string[];
  resolveRequest?: CustomResolver;
  resolverMainFields: string[];
  sourceExts: string[];
  unstable_enableSymlinks: boolean;
  unstable_conditionNames: string[];
  unstable_conditionsByPlatform: Readonly<{
    [platform: string]: string[];
  }>;
  unstable_enablePackageExports: boolean;
  useWatchman: boolean;
  requireCycleIgnorePatterns: ReadonlyArray<RegExp>;
}

/**
 * 패키지에서 타입 정의 파일이 export 되어있지 않아 별도로 타입을 정의합니다.
 */
export interface MetroConfig {
  readonly watchFolders?: string[];
  readonly cacheStores?: any;
  readonly resolver?: Partial<ResolverConfig>;
  readonly server?: any;
  readonly serializer?: object & {
    getPolyfills?: () => string[];
  };
  readonly symbolicator?: any;
  readonly transformer?: any;
  readonly watcher?: any;
  readonly reporter?: {
    update: (event: ReportableEvent) => void;
  };
}
