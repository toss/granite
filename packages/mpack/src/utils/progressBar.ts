import type { BuildResult } from '@granite-js/plugin-core';
import * as Frogress from 'frogress-bar';

export interface BuildStatusProgressBar {
  start: (moduleCount: number, totalModuleCount: number) => void;
  update: (moduleCount: number, totalModuleCount?: number) => void;
  done: (result: BuildResult) => void;
  hide: () => void;
  remove: () => void;
}

const PROGRESS_TEMPLATE = '{status} {progress} ({value}/{total}) | {label}';
const STATUS_SYMBOLS = {
  waiting: '…',
  running: '●',
  warning: '!',
  error: '✕',
  success: '✓',
} as const;

export function createProgressBar(label: string): BuildStatusProgressBar {
  const progressBar = Frogress.create({
    template: PROGRESS_TEMPLATE,
    total: 0,
    placeholder: {
      label: Frogress.color(label, 'gray'),
      status: Frogress.color(STATUS_SYMBOLS.waiting, 'gray'),
    },
  });

  return {
    start: (moduleCount, totalModuleCount) => {
      progressBar.start({
        value: moduleCount,
        total: totalModuleCount,
      });
    },
    update: (moduleCount, totalModuleCount) => {
      progressBar.update({
        value: moduleCount,
        total: totalModuleCount ?? moduleCount,
        placeholder: {
          status: Frogress.color(STATUS_SYMBOLS.running, 'gray'),
        },
      });
    },
    done: (result) => {
      const { value } = progressBar.getState();
      let status: string;

      switch (true) {
        case result.errors.length > 0:
          status = Frogress.color(STATUS_SYMBOLS.error, 'red');
          break;

        case result.warnings.length > 0:
          status = Frogress.color(STATUS_SYMBOLS.warning, 'yellow');
          break;

        default:
          status = Frogress.color(STATUS_SYMBOLS.success, 'blue');
      }

      progressBar.update({
        value,
        placeholder: { status },
      });
    },
    remove: () => {
      Frogress.remove(progressBar);
    },
    hide: () => {
      progressBar.stop();
    },
  };
}

export function cleanup() {
  Frogress.removeAll();
}
