import fs from 'fs';
import os from 'os';
import path from 'path';
import { getLocalTempDirectoryPath } from '@granite-js/utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prepareGraniteGlobalsScript } from './graniteGlobals';

describe('prepareGraniteGlobalsScript', () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-globals-'));
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  function readGeneratedScript() {
    return fs.readFileSync(path.join(getLocalTempDirectoryPath(rootDir), 'granite-globals.js'), 'utf-8');
  }

  it('injects app metadata into global.__granite.app', () => {
    prepareGraniteGlobalsScript({
      rootDir,
      appName: 'my-app',
      scheme: 'granite',
      host: '',
      standalone: false,
    });

    const script = readGeneratedScript();
    expect(script).toContain(
      'global.__granite.app = { name: "my-app", scheme: "granite", host: "", standalone: false };'
    );
  });

  it('marks standalone apps in the injected globals', () => {
    prepareGraniteGlobalsScript({
      rootDir,
      appName: 'my-app',
      scheme: 'myapp',
      host: '',
      standalone: true,
    });

    const script = readGeneratedScript();
    expect(script).toContain('standalone: true');
  });
});
