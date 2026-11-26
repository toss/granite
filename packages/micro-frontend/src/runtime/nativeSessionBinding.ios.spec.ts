import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

it.runIf(process.platform === 'darwin')(
  'validates release-mode session keys and requires fresh registrations after runtime replacement',
  () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'granite-native-session-'));
    try {
      const binary = join(temporaryDirectory, 'session-binding');
      execFileSync('xcrun', [
        'clang++',
        '-std=c++17',
        '-fobjc-arc',
        '-fblocks',
        '-DNS_BLOCK_ASSERTIONS=1',
        '-framework',
        'Foundation',
        '-I',
        resolve(packageDirectory, 'ios'),
        resolve(packageDirectory, 'ios/GraniteMicroFrontendRuntimeHost.mm'),
        resolve(packageDirectory, 'test/ios/SessionBindingTokenHarness.mm'),
        '-o',
        binary,
      ]);
      execFileSync(binary);
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  },
  30_000
);
