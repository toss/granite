import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { microFrontend } from './microFrontendPlugin';

describe('microFrontend plugin', () => {
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-micro-frontend-'));
    vi.spyOn(process, 'cwd').mockReturnValue(temporaryDirectory);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('transforms dispose ownership through the common Metro and Mpack source transformer', async () => {
    const plugin = await microFrontend();

    if (plugin.build?.order === 'pre') {
      await plugin.build.handler.call(
        { meta: {} },
        {
          appName: 'app-1',
          cwd: temporaryDirectory,
          entryFile: './src/_app.tsx',
          outdir: 'dist',
        }
      );
    }
    const config = typeof plugin.config === 'function' ? await plugin.config({ command: 'build' }) : plugin.config;
    const source = 'globalThis._graniteMicroFrontend.dispose(() => clear());';

    expect(config?.babel).toBeUndefined();
    expect(config?.transformer?.transformSync?.('/project/src/App.tsx', source)).toContain(
      'globalThis._graniteMicroFrontend.dispose("app-1", () => clear());'
    );
    expect(config?.esbuild?.prelude).toEqual([
      path.join(temporaryDirectory, '.granite', 'granite-micro-frontend-runtime.js'),
    ]);
  });
});
