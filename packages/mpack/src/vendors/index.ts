// metro
import Metro from './metro/src';
import TerminalReporter from './metro/src/lib/TerminalReporter';
// metro-config
import { getDefaultValues } from './metro-config/src/defaults';
import { loadConfig, mergeConfig } from './metro-config/src/loadConfig';
// metro-core
import Terminal from './metro-core/src/Terminal';
// metro-inspector-proxy
import InspectorProxy from './metro-inspector-proxy/src/InspectorProxy';

const vendorModules = {
  metro: {
    Metro,
    TerminalReporter,
  },
  'metro-config': {
    getDefaultValues,
    loadConfig,
    mergeConfig,
  },
  'metro-core': {
    Terminal,
  },
  'metro-inspector-proxy': {
    InspectorProxy,
  },
} as const;

export function getModule<Source extends keyof typeof vendorModules>(source: Source): (typeof vendorModules)[Source] {
  return vendorModules[source];
}
