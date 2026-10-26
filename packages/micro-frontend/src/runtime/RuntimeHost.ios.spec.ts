import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it.skipIf(process.platform !== 'darwin')('preserves execution lifetime in native iOS session events', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const directory = mkdtempSync(path.join(tmpdir(), 'mf-ios-session-'));
  try {
    const binary = path.join(directory, 'runtime-host-test');
    execFileSync('clang++', [
      '-std=c++17', '-fobjc-arc', '-framework', 'Foundation', '-I', path.join(root, 'ios'),
      path.join(root, 'ios/GraniteMicroFrontendRuntimeHost.mm'),
      path.join(root, 'test/native/RuntimeHostTest.mm'), '-o', binary,
    ], { stdio: 'pipe' });
    expect(execFileSync(binary, { encoding: 'utf8' })).toContain('PASS: iOS lifecycle execution identity');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
