#!/usr/bin/env node

import { parseReleaseProfilerCliArgs } from './cli-args';
import { startReleaseProfilerServer } from './index';

export async function run(argv = process.argv.slice(2)) {
  const options = parseReleaseProfilerCliArgs(argv);
  await startReleaseProfilerServer(options);
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
