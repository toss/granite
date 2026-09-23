import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startHTTPScenario } from './harness';

let server: Awaited<ReturnType<typeof startHTTPScenario>>;

async function post(path: string, body = {}) {
  return server.request(`/__test/${path}`, { method: 'POST', body });
}

async function publish(appName: string, contents: string, channel?: string, tag?: string) {
  const response = await post('publish', { appName, contents, channel, tag });
  const result = await response.json();
  expect(response.status, JSON.stringify(result)).toBe(201);
  return result as { deploymentId: string };
}

async function settle() {
  const response = await post('settle');
  expect(response.status, await response.text()).toBe(200);
}

const get = (path: string) => server.request(path);

beforeAll(async () => {
  server = await startHTTPScenario();
});
beforeEach(async () => {
  expect((await post('reset')).status).toBe(200);
});
afterAll(async () => {
  await server?.close();
});

describe('bundle delivery over HTTP in the Lambda Node 22 runtime', () => {
  it.each(['ios', 'android'])(
    'a %s client receives its app/shared channel while legacy and other channels stay isolated',
    async (platform) => {
      for (const app of ['sample-app', 'shared']) {
        await publish(app, `${app}-legacy`);
        const next = await publish(app, `${app}-next`, 'next');
        await publish(app, `${app}-stable`, 'stable');
        await settle();
        for (const [suffix, version] of [
          ['bundle', 'legacy'],
          ['next', 'next'],
          ['stable', 'stable'],
        ]) {
          const response = await get(`/${platform}/${app}/1/${suffix}`);
          expect(response.status).toBe(200);
          expect(response.headers.get('content-encoding')).toBe('gzip');
          expect(await response.text()).toBe(`${app}-${version}:${platform}`);
          if (suffix === 'next') {
            expect(response.headers.get('x-deployment-id')).toBe(next.deploymentId);
            expect(response.headers.get('x-deployed-at')).toBeTruthy();
          }
        }
      }
    }
  );

  it('a cached 404 becomes a bundle after channel registration and a successful first publication', async () => {
    const url = '/ios/sample-app/1/next';
    expect((await get(url)).status).toBe(404);
    expect((await post('register', { appName: 'sample-app', channel: 'next' })).status).toBe(201);
    await settle();
    expect((await get(url)).status).toBe(404);
    await publish('sample-app', 'first', 'next');
    expect((await get(url)).status).toBe(404);
    await settle();
    expect(await (await get(url)).text()).toBe('first:ios');
  });

  it('clients keep the cached release until invalidation completes, without evicting another app', async () => {
    await publish('sample-app', 'old', 'next');
    await publish('sample-app', 'stable', 'stable');
    await publish('another-app', 'other', 'next');
    await settle();
    const url = '/ios/sample-app/1/next';
    const stable = '/android/sample-app/1/stable';
    const other = '/ios/another-app/1/next';
    for (const path of [url, stable, other]) {
      await get(path);
    }
    await publish('sample-app', 'new', 'next');
    expect(await (await get(url)).text()).toBe('old:ios');
    await settle();
    expect(await (await get(url)).text()).toBe('new:ios');
    const stableResponse = await get(stable);
    expect(stableResponse.headers.get('x-test-cache')).toBe('MISS');
    expect(await stableResponse.text()).toBe('stable:android');
    const otherResponse = await get(other);
    expect(otherResponse.headers.get('x-test-cache')).toBe('HIT');
    expect(await otherResponse.text()).toBe('other:ios');
  });

  it.each(['ios', 'android'])(
    'a failed %s upload keeps both client platforms on the previous release, then retry succeeds',
    async (platform) => {
      await publish('sample-app', 'old', 'next');
      await settle();
      await post('faults', { uploadPlatform: platform });
      expect(
        (await post('publish', { appName: 'sample-app', contents: 'new', channel: 'next' })).status
      ).toBeGreaterThanOrEqual(400);
      await settle();
      for (const target of ['ios', 'android']) {
        expect(await (await get(`/${target}/sample-app/1/next`)).text()).toBe(`old:${target}`);
      }
      await post('faults');
      await publish('sample-app', 'retry', 'next');
      await settle();
      expect(await (await get('/ios/sample-app/1/next')).text()).toBe('retry:ios');
    }
  );

  it('a failed first publication stays unavailable and a retry activates the same channel', async () => {
    await publish('sample-app', 'legacy');
    await post('faults', { uploadPlatform: 'android' });
    expect(
      (await post('publish', { appName: 'sample-app', contents: 'first', channel: 'next' })).status
    ).toBeGreaterThanOrEqual(400);
    await settle();
    expect((await get('/ios/sample-app/1/next')).status).toBe(404);
    expect(await (await get('/ios/sample-app/1/bundle')).text()).toBe('legacy:ios');
    await post('faults');
    await publish('sample-app', 'retry', 'next');
    await settle();
    expect(await (await get('/android/sample-app/1/next')).text()).toBe('retry:android');
  });

  it('canary clients move to a new release and return to the old release after rollback', async () => {
    const old = await publish('sample-app', 'old', 'next');
    const next = await publish('sample-app', 'new', 'next');
    await post('rollout', { appName: 'sample-app', channel: 'next', deploymentId: old.deploymentId, progress: 100 });
    const rollout = await post('rollout', {
      appName: 'sample-app',
      channel: 'next',
      deploymentId: next.deploymentId,
      progress: 1,
    });
    expect(rollout.status).toBe(200);
    const { targetGroup, baselineGroup } = (await rollout.json()) as { targetGroup: string; baselineGroup: string };
    await settle();
    for (const platform of ['ios', 'android']) {
      expect(await (await get(`/${platform}/sample-app/${targetGroup}/next`)).text()).toBe(`new:${platform}`);
      expect(await (await get(`/${platform}/sample-app/${baselineGroup}/next`)).text()).toBe(`old:${platform}`);
    }
    await post('rollout', { appName: 'sample-app', channel: 'next', deploymentId: next.deploymentId, progress: 0 });
    await settle();
    expect(await (await get(`/ios/sample-app/${targetGroup}/next`)).text()).toBe('old:ios');
  });

  it('existing filename-tag clients keep their bundle when an overlapping channel is rejected', async () => {
    await publish('sample-app', 'tagged', undefined, 'custom-tag');
    await settle();
    expect(await (await get('/ios/sample-app/1/custom-tag')).text()).toBe('tagged:ios');
    expect(
      (await post('publish', { appName: 'sample-app', contents: 'channel', channel: 'custom-tag' })).status
    ).toBeGreaterThanOrEqual(400);
    await settle();
    expect(await (await get('/ios/sample-app/1/custom-tag')).text()).toBe('tagged:ios');
  });

  it('concurrent channel and legacy-tag publications leave one unambiguous client URL', async () => {
    const results = await Promise.all([
      post('publish', { appName: 'sample-app', channel: 'preview', contents: 'channel' }),
      post('publish', { appName: 'sample-app', tag: 'preview', contents: 'tagged' }),
    ]);
    expect(results.filter((response) => response.status === 201)).toHaveLength(1);
    expect(results.filter((response) => response.status >= 400)).toHaveLength(1);
    await settle();
    const response = await get('/ios/sample-app/1/preview');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(results[0]!.status === 201 ? 'channel:ios' : 'tagged:ios');
  });

  it.each(['missing', 'corrupt'])(
    'a client sees an error for %s channel state instead of receiving an incompatible legacy bundle',
    async (kind) => {
      await publish('sample-app', 'legacy');
      await publish('sample-app', 'next', 'next');
      await settle();
      await get('/ios/sample-app/1/next');
      await post('damage-state', { appName: 'sample-app', channel: 'next', kind });
      await settle();
      const response = await get('/ios/sample-app/1/next');
      expect(response.status).toBe(kind === 'missing' ? 404 : 502);
      expect(await response.text()).not.toContain('legacy:ios');
      expect(await (await get('/ios/sample-app/1/bundle')).text()).toBe('legacy:ios');
    }
  );

  it('a channel storage outage returns an error while the legacy URL remains available, then recovers', async () => {
    await publish('sample-app', 'legacy');
    await publish('sample-app', 'next', 'next');
    await settle();
    await post('faults', { readState: { appName: 'sample-app', channel: 'next' } });
    const response = await get('/ios/sample-app/1/next');
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(await response.text()).not.toContain('legacy:ios');
    expect(await (await get('/ios/sample-app/1/bundle')).text()).toBe('legacy:ios');
    await post('faults');
    expect(await (await get('/ios/sample-app/1/next')).text()).toBe('next:ios');
  });

  it('an invalidation outage keeps cached bytes, and retry exposes the new release', async () => {
    await publish('sample-app', 'old', 'next');
    await settle();
    await get('/ios/sample-app/1/next');
    await post('faults', { invalidation: true });
    await publish('sample-app', 'new', 'next');
    expect((await post('settle')).status).toBeGreaterThanOrEqual(500);
    expect(await (await get('/ios/sample-app/1/next')).text()).toBe('old:ios');
    await post('faults');
    await settle();
    expect(await (await get('/ios/sample-app/1/next')).text()).toBe('new:ios');
  });

  it('query parameters cannot switch channels and invalid client routes return 400', async () => {
    await publish('sample-app', 'legacy');
    await publish('sample-app', 'next', 'next');
    await settle();
    expect(await (await get('/ios/sample-app/1/bundle?channel=next')).text()).toBe('legacy:ios');
    expect(await (await get('/ios/sample-app/1/next?channel=stable')).text()).toBe('next:ios');
    for (const path of [
      '/ios/sample-app/0/next',
      '/ios/sample-app/1001/next',
      '/ios/sample-app/testers/next',
      '/ios/sample-app/1/next/extra',
    ]) {
      expect((await get(path)).status).toBe(400);
    }
  });
});
