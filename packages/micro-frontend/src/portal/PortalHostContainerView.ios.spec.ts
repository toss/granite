import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { arch } from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(sourceDirectory, '../..');
const iosDirectory = resolve(packageDirectory, 'ios');
const testDirectory = resolve(packageDirectory, 'test/ios');
const harnessPath = resolve(testDirectory, 'PortalHostContainerTouchOwnershipHarness.mm');
const portalHostContainerPath = resolve(iosDirectory, 'PortalHostContainerView.mm');
const stubIncludeDirectory = resolve(testDirectory, 'stubs');
const simulatorId = process.env.GRANITE_IOS_TOUCH_HARNESS_SIMULATOR;
const runWithSimulator = process.platform === 'darwin' && simulatorId != null && simulatorId.length > 0;

function compileTouchOwnershipHarness(temporaryDirectory: string): string {
  const sdkPath = execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], {
    encoding: 'utf8',
  }).trim();
  const binaryPath = join(temporaryDirectory, 'PortalHostContainerTouchOwnershipHarness');
  const targetArch = arch === 'x64' ? 'x86_64' : 'arm64';

  execFileSync('xcrun', [
    '--sdk',
    'iphonesimulator',
    'clang++',
    '-ObjC++',
    '-fobjc-arc',
    '-fblocks',
    '-target',
    `${targetArch}-apple-ios18.0-simulator`,
    '-isysroot',
    sdkPath,
    '-framework',
    'UIKit',
    '-framework',
    'Foundation',
    '-framework',
    'CoreGraphics',
    '-I',
    stubIncludeDirectory,
    '-I',
    iosDirectory,
    portalHostContainerPath,
    harnessPath,
    '-o',
    binaryPath,
  ]);

  return binaryPath;
}

function runTouchOwnershipHarness(simulator: string): void {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'granite-portal-touch-'));
  try {
    const binaryPath = compileTouchOwnershipHarness(temporaryDirectory);
    execFileSync('xcrun', ['simctl', 'spawn', simulator, binaryPath]);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

describe('PortalHostContainerView touch ownership', () => {
  it.runIf(runWithSimulator)('lets only the owning Fabric touch handler receive portal-hosted touches', () => {
    if (simulatorId == null) {
      throw new Error('GRANITE_IOS_TOUCH_HARNESS_SIMULATOR is required');
    }
    runTouchOwnershipHarness(simulatorId);
  });
});
