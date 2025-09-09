import type { Config } from 'jest';
import originalConfig from './jest.config';
import { setup as originalSetup } from './setup';

interface Export {
  config: Config;
  setup: typeof originalSetup;
}

const exported: Export = {
  config: originalConfig,
  setup: originalSetup,
};

export const setup = originalSetup;
export const config = originalConfig;

export default exported;
