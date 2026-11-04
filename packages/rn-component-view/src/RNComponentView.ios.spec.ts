import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { arch } from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iosDirectory = resolve(packageDirectory, 'ios');
const testDirectory = resolve(packageDirectory, 'test/ios');
// RNComponentView hosts its content in the Portal container of the micro-frontend runtime. The harnesses compile it
// with the React stubs of that package's own harnesses.
const microFrontendDirectory = resolve(packageDirectory, '../micro-frontend');
const simulatorId = process.env.GRANITE_IOS_TOUCH_HARNESS_SIMULATOR;
const runHarnesses = process.platform === 'darwin' && simulatorId != null && simulatorId.length > 0;

function withTemporaryDirectory(run: (temporaryDirectory: string) => void): void {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'granite-rn-component-view-'));
  try {
    run(temporaryDirectory);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

/** Lays the micro-frontend headers out as CocoaPods does, for `#import <GraniteMicroFrontendRuntime/...>`. */
function createPodHeaderDirectory(temporaryDirectory: string): string {
  const headerDirectory = join(temporaryDirectory, 'include');
  mkdirSync(headerDirectory);
  symlinkSync(resolve(microFrontendDirectory, 'ios'), join(headerDirectory, 'GraniteMicroFrontendRuntime'));
  return headerDirectory;
}

describe('RNComponentView', () => {
  it.runIf(runHarnesses)('opens a component session in a window and sizes itself from the renderer', () => {
    if (simulatorId == null) {
      throw new Error('GRANITE_IOS_TOUCH_HARNESS_SIMULATOR is required');
    }
    withTemporaryDirectory((temporaryDirectory) => {
      const sdkPath = execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], {
        encoding: 'utf8',
      }).trim();
      const binaryPath = join(temporaryDirectory, 'RNComponentViewHarness');
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
        createPodHeaderDirectory(temporaryDirectory),
        '-I',
        resolve(microFrontendDirectory, 'test/ios/stubs'),
        '-I',
        iosDirectory,
        resolve(microFrontendDirectory, 'ios/PortalHostContainerView.mm'),
        resolve(iosDirectory, 'RNComponentView.mm'),
        resolve(iosDirectory, 'RNComponentSessions.mm'),
        resolve(iosDirectory, 'RNComponentSessionStore.mm'),
        resolve(testDirectory, 'RNComponentViewHarness.mm'),
        '-o',
        binaryPath,
      ]);
      execFileSync('xcrun', ['simctl', 'spawn', simulatorId, binaryPath]);
    });
  });
});

describe('RNComponentSessionStore', () => {
  // The store uses Foundation only, so the harness runs on the Mac, next to the simulator harness.
  it.runIf(runHarnesses)('sends open components to the first live renderer and sizes back to the sessions', () => {
    withTemporaryDirectory((temporaryDirectory) => {
      const binaryPath = join(temporaryDirectory, 'RNComponentSessionStoreHarness');

      execFileSync('xcrun', [
        'clang++',
        '-ObjC++',
        '-fobjc-arc',
        '-I',
        iosDirectory,
        resolve(iosDirectory, 'RNComponentSessions.mm'),
        resolve(iosDirectory, 'RNComponentSessionStore.mm'),
        resolve(testDirectory, 'RNComponentSessionStoreHarness.mm'),
        '-framework',
        'Foundation',
        '-o',
        binaryPath,
      ]);
      execFileSync(binaryPath);
    });
  });
});
