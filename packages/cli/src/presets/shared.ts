import type { PresetContext } from '@granite-js/mpack';
import { getGlobalVariables, getReactNativeSetupScripts, preludePresets } from './common';
import { babelConditions } from './common/babelConditions';
import { getBuildNumber } from './utils/getBuildNumber';

function getCommonSharedPreset(context: PresetContext) {
  const { rootDir, dev } = context;
  const buildNumber = getBuildNumber();

  return {
    esbuild: {
      define: getGlobalVariables({ dev }),
      banner: {
        js: [preludePresets.globalVariables({ dev }), preludePresets.graniteSharedEnvironment({ buildNumber })].join(
          '\n'
        ),
      },
      prelude: [...getReactNativeSetupScripts(rootDir)],
    },
    babel: {
      conditions: babelConditions,
    },
  };
}

export const shared = () => (context: PresetContext) => {
  return getCommonSharedPreset(context);
};
