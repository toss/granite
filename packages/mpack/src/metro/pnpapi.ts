import type { getPackageInformation, topLevel } from 'pnpapi';

export interface PnpApi {
  getPackageInformation: typeof getPackageInformation;
  topLevel: typeof topLevel;
}

export let pnpapi: PnpApi | undefined;

try {
  pnpapi = require('pnpapi');
} catch {
  /* noop */
}
