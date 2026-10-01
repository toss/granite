import path from 'path';
import { getPackageRoot } from '@granite-js/utils';
import { isNotNil } from 'es-toolkit';
import { prepareGraniteGlobalsScript } from './graniteGlobals';
import { pluginConfigSchema, type CompleteGraniteConfig, type GraniteConfig } from '../schema/pluginConfig';
import { resolvePlugins } from '../utils/resolvePlugins';

/**
 * @public
 * @category Configuration
 * @name defineConfig
 * @description
 * Configures your Granite application by defining key settings in `granite.config.ts`.
 *
 * The configuration lets you specify:
 * - How users will access your app through a URL scheme (e.g. `granite://`)
 * - Your app's unique name that appears in the URL (e.g. `granite://my-service`)
 * - Build settings for bundlers like ESBuild and Metro
 * - Code transformation settings through Babel
 * - Additional functionality through Granite plugins
 *
 * @param config - Configuration options
 * @param config.cwd - Working directory for build process (defaults to process.cwd())
 * @param config.appName - Your app's unique identifier
 * @param config.host - Host name for your app (e.g. 'scheme://host/app-name')
 * @param config.scheme - URL scheme for launching your app (e.g. 'granite')
 * @param config.outdir - Where to output build files (defaults to 'dist')
 * @param config.entryFile - Your app's entry point (defaults to './src/_app.tsx')
 * @param config.build - Customize build settings
 * @param config.metro - Configure Metro bundler settings
 * @param config.devServer - Configure Mpack dev server settings
 * @param config.plugins - Granite plugins to enhance functionality
 * @param config.reactNativePath - Path to `react-native` directory
 * @returns The processed configuration
 */
export const defineConfig = async (config: GraniteConfig): Promise<CompleteGraniteConfig> => {
  const parsed = pluginConfigSchema.parse(config);
  const cwd = parsed.cwd ?? getPackageRoot();
  const appName = parsed.appName;
  const host = parsed.host ?? '';
  const scheme = parsed.scheme;
  const entryFile = path.resolve(cwd, parsed.entryFile);
  const outdir = path.join(cwd, parsed.outdir);
  const parsedConfig = {
    ...parsed.build,
    devServer: parsed.devServer,
    metro: parsed.metro,
  };

  const { configs, pluginHooks } = await resolvePlugins(parsed.plugins);
  const globalsScriptConfig = prepareGraniteGlobalsScript({ rootDir: cwd, appName, scheme, host });

  return {
    cwd,
    appName,
    entryFile,
    outdir,
    pluginHooks,
    pluginConfigs: [parsedConfig, globalsScriptConfig, ...configs].filter(isNotNil),
    reactNativePath: parsed.reactNativePath,
  };
};
