#!/usr/bin/env node

import { initialize } from '@granite-js/cli';

initialize().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
