import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { flattenPluginOption, getDefaultConfig, resolvePluginConfig, runBuild } from 'rollipop';
import { expect, it } from 'vitest';
import type { ExecutionContext } from '../execution/context';
import { microFrontend } from './index';

it('preserves interleaved owners in the final production bundle after the native RN transform', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const directory = mkdtempSync(path.join(root, '.execution-bundle-'));
  try {
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ sideEffects: true }));
    const entry = path.join(directory, 'entry.js');
    writeFileSync(entry, `
      import { getExecutionContext } from '@granite-js/micro-frontend/execution';
      const context = getExecutionContext();
      async function* values(gate) {
        await gate;
        yield context.capture()?.id ?? null;
      }
      async function shared(gate) {
        for await (const owner of values(gate)) {
          await Promise.resolve();
          if (context.capture()?.id !== owner) throw new Error('Iterator ownership changed');
          return owner;
        }
      }
      globalThis.ownershipHarness = { context, shared };
    `);
    const plugins = await flattenPluginOption(microFrontend({ appName: 'bundle-fixture', executionOwnership: true }));
    const base = {
      ...await getDefaultConfig(root, 'production'),
      entry, plugins, prelude: [], polyfills: [], configFile: '',
    };
    const resolved = await resolvePluginConfig(base, plugins);
    const result = await runBuild({ ...resolved, plugins }, { platform: 'android', dev: false, cache: false });
    expect(result.code).toContain('microFrontend.asyncExecution.v1');
    expect(result.code).toContain('asyncToGenerator');
    const harness: { context: ExecutionContext; shared(gate: Promise<void>): Promise<string | null> } = runInNewContext(
      `${result.code}\nglobalThis.ownershipHarness;`
    );
    const a = Promise.withResolvers<void>();
    const b = Promise.withResolvers<void>();
    const first = harness.context.run({ id: 'bundle:a' }, () => harness.shared(a.promise));
    const second = harness.context.run({ id: 'bundle:b' }, () => harness.shared(b.promise));
    b.resolve();
    expect(await second).toBe('bundle:b');
    a.resolve();
    expect(await first).toBe('bundle:a');
    expect(harness.context.capture()).toBeNull();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 30_000);
