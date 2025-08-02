import { delay, noop } from 'es-toolkit';
import { persistentStorage } from '../shared/PersistentStorage';
import { Plugin, PluginHandlers } from '../types';
import { printSummary } from '../utils/printSummary';
import { BuildStatusProgressBar, createProgressBar } from '../utils/progressBar';

export function statusPlugin(handlers?: PluginHandlers): Plugin {
  let progressBar: BuildStatusProgressBar;
  let totalModuleCount: number | undefined;

  return {
    name: 'dev-server-status-plugin',
    prepare(config) {
      if (progressBar != null) {
        return;
      }

      progressBar = createProgressBar(config.buildConfig.platform);
      totalModuleCount = persistentStorage.getData()[this.id]?.totalModuleCount;
    },
    buildStart() {
      // `0 / 0 = NaN` 방지를 위해 total 값을 1로 지정
      progressBar?.start(0, totalModuleCount ?? 1);
      handlers?.onStart?.();
    },
    buildEnd(result) {
      if ('bundle' in result) {
        totalModuleCount = result.totalModuleCount;
        persistentStorage.setData({ [this.id]: { totalModuleCount: result.totalModuleCount } });
        persistentStorage.saveData();
      } else {
        totalModuleCount = undefined;
      }

      progressBar.hide();
      progressBar.remove();
      handlers?.onEnd?.();

      delay(100)
        .then(() => printSummary(result))
        .catch(noop);
    },
    load: (moduleCount) => {
      progressBar.update(moduleCount, totalModuleCount);
    },
  };
}
