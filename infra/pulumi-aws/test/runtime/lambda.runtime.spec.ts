import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLambdaSource } from '../../src/lambda-code';

const image = 'public.ecr.aws/lambda/nodejs:22';
const require = createRequire(import.meta.url);
const fixturesPath = fileURLToPath(new URL('./fixtures', import.meta.url));
const containers: string[] = [];
const stagingContainers: string[] = [];
const preparedImages = new Set<string>();
const runtimeContainers: Record<string, string> = {};
const artifacts: Record<string, string> = {};
let directory: string;

interface Fixtures {
  objects?: Record<string, { body: string; status?: number; code?: string }>;
  cloudfrontError?: boolean;
}
interface Invocation {
  result: any;
  calls: { method: string; pathname: string; body: string }[];
}

function docker(args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile('docker', args, { timeout: 60_000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`docker ${args[0]} failed: ${stderr || error.message}`));
      } else {
        resolve(stdout.trim());
      }
    });
    child.stdin?.end(input);
  });
}

async function start(name: string, handler: string, withDistribution = true) {
  // Populate a stopped staging container, then start its snapshot read-only.
  // This also works with remote Docker daemons without mounting host directories.
  const staging = await docker(['create', '--platform', 'linux/amd64', '--network', 'none', image, 'index.handler']);
  stagingContainers.push(staging);
  if (name !== 'probe') {
    await docker(['cp', `${join(directory, name)}/.`, `${staging}:/var/task`]);
  }
  await docker(['cp', fixturesPath, `${staging}:/opt/test`]);
  const preparedImage = await docker(['commit', staging]);
  preparedImages.add(preparedImage);
  const container = await docker([
    'create',
    '--platform',
    'linux/amd64',
    '--network',
    'none',
    '--read-only',
    '--user',
    '1000:1000',
    '--tmpfs',
    '/tmp',
    '--env',
    'AWS_REGION=us-east-1',
    '--env',
    'AWS_DEFAULT_REGION=us-east-1',
    '--env',
    'AWS_ACCESS_KEY_ID=test',
    '--env',
    'AWS_SECRET_ACCESS_KEY=test',
    '--env',
    'AWS_EC2_METADATA_DISABLED=true',
    '--env',
    'AWS_MAX_ATTEMPTS=1',
    '--env',
    'AWS_ENDPOINT_URL_S3=http://127.0.0.1:9567',
    '--env',
    'AWS_ENDPOINT_URL_CLOUDFRONT=http://127.0.0.1:9567',
    ...(withDistribution ? ['--env', 'CLOUDFRONT_DISTRIBUTION_ID=sample-distribution'] : []),
    '--entrypoint',
    '/bin/sh',
    preparedImage,
    '-c',
    `/var/lang/bin/node /opt/test/aws-stub.cjs & exec /lambda-entrypoint.sh ${handler}`,
  ]);
  containers.push(container);
  runtimeContainers[name] = container;
  await docker(['start', container]);
  return container;
}

async function invoke(name: string, event: unknown, fixtures: Fixtures = {}): Promise<Invocation> {
  const output = await docker(
    ['exec', '-i', runtimeContainers[name]!, '/var/lang/bin/node', '/opt/test/invoke.cjs'],
    JSON.stringify({ event, fixtures })
  );
  return JSON.parse(output);
}

function cloudfrontEvent(uri: string, querystring = '') {
  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: 'cdn.example.com',
            distributionId: 'sample',
            eventType: 'origin-request',
            requestId: 'request',
          },
          request: { uri, method: 'GET', clientIp: '127.0.0.1', querystring, headers: {} },
        },
      },
    ],
  };
}

function channelFixtures(app = 'sample-app', channel = 'next', deploymentId = 'release'): Fixtures {
  return {
    objects: {
      [`deployments/${app}/selectors/${channel}.json`]: { body: JSON.stringify({ version: 1, type: 'CHANNEL' }) },
      [`channels/${channel}/deployments/${app}/deployment_state`]: {
        body: JSON.stringify({ type: 'STABLE', deploymentId }),
      },
      [`deployments/${app}/deployment_state`]: { body: JSON.stringify({ type: 'STABLE', deploymentId: 'legacy' }) },
    },
  };
}

function s3Event(keys: string[]) {
  return {
    Records: keys.map((key) => ({
      eventName: 'ObjectCreated:Put',
      s3: {
        bucket: { name: 'sample-bucket' },
        object: { key: encodeURIComponent(key) },
      },
    })),
  };
}

beforeAll(async () => {
  await docker(['info', '--format', '{{.OSType}}']);
  await docker(['image', 'inspect', image]).catch(() => {
    throw new Error(`Pull the official runtime first: docker pull --platform linux/amd64 ${image}`);
  });
  directory = await mkdtemp(join(tmpdir(), 'lambda-node22-'));
  for (const name of ['origin-request', 'origin-response', 'auto-cache-removal', 'missing-config']) {
    const entry = name === 'missing-config' ? 'auto-cache-removal' : name;
    const source = createLambdaSource({
      sourcePath: require.resolve(`@granite-js/pulumi-aws/lambda/${entry}`),
      bucketName: 'sample-bucket',
      region: 'us-east-1',
    });
    artifacts[name] = createHash('sha256').update(source).digest('hex');
    await mkdir(join(directory, name));
    await writeFile(join(directory, name, 'index.js'), source);
    await start(name, 'index.handler', name !== 'missing-config');
  }
  await start('probe', '/opt/test/probe.handler');
});

afterAll(async () => {
  const cleanup = await Promise.allSettled(
    [...containers, ...stagingContainers].map((container) => docker(['rm', '--force', container]))
  );
  const imageCleanup = await Promise.allSettled(
    [...preparedImages].map((preparedImage) => docker(['image', 'rm', preparedImage]))
  );
  if (directory) {
    await rm(directory, { recursive: true, force: true });
  }
  for (const result of [...cleanup, ...imageCleanup]) {
    if (result.status === 'rejected') {
      throw result.reason;
    }
  }
});

describe('deployment artifacts in the AWS Lambda Node 22 runtime', () => {
  it('runs through RIE on Node 22, Amazon Linux 2023 and x86_64 with external networking disabled', async () => {
    const { result } = await invoke('probe', {});
    expect(result).toMatchObject({ platform: 'linux', arch: 'x64', version: expect.stringMatching(/^v22\./) });
    expect(result.uid).toBe(1000);
    expect(result.osRelease).toContain('VERSION_ID="2023"');
    for (const container of containers) {
      const [config] = JSON.parse(await docker(['inspect', container]));
      expect(config.HostConfig.NetworkMode).toBe('none');
      expect(config.HostConfig.ReadonlyRootfs).toBe(true);
      expect(config.Mounts.filter(({ Type }: { Type: string }) => Type === 'bind')).toEqual([]);
    }
    console.log('Lambda runtime:', JSON.stringify(result));
    console.log(
      'Runtime image:',
      await docker(['image', 'inspect', image, '--format', '{{.Id}} {{json .RepoDigests}}'])
    );
  });

  it('loads exactly the index.js generated by the production archive builder', async () => {
    for (const name of Object.keys(artifacts)) {
      const hash = await docker([
        'exec',
        runtimeContainers[name]!,
        '/var/lang/bin/node',
        '-e',
        "console.log(require('node:crypto').createHash('sha256').update(require('node:fs').readFileSync('/var/task/index.js')).digest('hex'))",
      ]);
      expect(hash).toBe(artifacts[name]);
    }
  });

  it.each(['ios', 'android'])(
    'routes both app and shared %s bundles through the real SDK HTTP transport',
    async (platform) => {
      for (const app of ['sample-app', 'shared']) {
        const { result, calls } = await invoke(
          'origin-request',
          cloudfrontEvent(`/${platform}/${app}/1/next`),
          channelFixtures(app)
        );
        expect(result).toMatchObject({ uri: `/channels/next/bundles/${app}/release/bundle.${platform}.hbc.gz` });
        expect(calls.map(({ pathname }) => pathname)).toEqual([
          `/sample-bucket/deployments/${app}/selectors/next.json`,
          `/sample-bucket/channels/next/deployments/${app}/deployment_state`,
        ]);
      }
    }
  );

  it.each(['bundle', 'custom-tag'])(
    'preserves the legacy %s URL and ignores a channel query override',
    async (suffix) => {
      const { result } = await invoke(
        'origin-request',
        cloudfrontEvent(`/ios/sample-app/1/${suffix}`, 'channel=next'),
        channelFixtures()
      );
      expect(result).toMatchObject({
        uri: `/bundles/sample-app/legacy/bundle.ios${suffix === 'bundle' ? '' : `.${suffix}`}.hbc.gz`,
        querystring: 'channel=next',
      });
    }
  );

  it('discovers a new registration and updated rollout within the same warm runtime', async () => {
    const fixtures: Fixtures = {
      objects: { 'deployments/sample-app/deployment_state': { body: '{"type":"STABLE","deploymentId":"legacy"}' } },
    };
    const event = cloudfrontEvent('/ios/sample-app/1/next');
    expect((await invoke('origin-request', event, fixtures)).result.uri).toBe(
      '/bundles/sample-app/legacy/bundle.ios.next.hbc.gz'
    );
    fixtures.objects!['deployments/sample-app/selectors/next.json'] = { body: '{"version":1,"type":"CHANNEL"}' };
    expect((await invoke('origin-request', event, fixtures)).result).toMatchObject({ status: '404' });
    expect(
      (await invoke('origin-request', event, channelFixtures('sample-app', 'next', 'new-release'))).result.uri
    ).toBe('/channels/next/bundles/sample-app/new-release/bundle.ios.hbc.gz');
  });

  it.each([0, 1, 50, 99, 100])('resolves both sides of the %i percent canary boundary', async (progress) => {
    const fixtures = channelFixtures();
    fixtures.objects!['channels/next/deployments/sample-app/deployment_state'] = {
      body: JSON.stringify({
        type: 'CANARY',
        deploymentId: { old: 'old', target: 'new' },
        progress: { previous: 50, current: progress },
        groupIdsCandidate: Array.from({ length: 1000 }, (_, i) => String(i + 1)),
      }),
    };
    for (const group of new Set([1, Math.max(1, progress * 10), Math.min(1000, progress * 10 + 1), 1000])) {
      const { result } = await invoke('origin-request', cloudfrontEvent(`/android/sample-app/${group}/next`), fixtures);
      expect(result.uri).toBe(
        `/channels/next/bundles/sample-app/${group <= progress * 10 ? 'new' : 'old'}/bundle.android.hbc.gz`
      );
    }
  });

  it.each(['missing', 'pending', 'corrupt', 'denied'])('fails closed when channel state is %s', async (kind) => {
    const fixtures = channelFixtures();
    const key = 'channels/next/deployments/sample-app/deployment_state';
    if (kind === 'missing') {
      delete fixtures.objects![key];
    } else {
      fixtures.objects![key] =
        kind === 'denied'
          ? { body: '', status: 403, code: 'AccessDenied' }
          : { body: kind === 'corrupt' ? '{' : '{"type":"PENDING"}' };
    }
    const { result, calls } = await invoke('origin-request', cloudfrontEvent('/ios/sample-app/1/next'), fixtures);
    if (kind === 'missing' || kind === 'pending') {
      expect(result).toMatchObject({ status: '404' });
    } else {
      expect(result.errorType).toBeTruthy();
    }
    expect(calls.map(({ pathname }) => pathname)).not.toContain(
      '/sample-bucket/deployments/sample-app/deployment_state'
    );
  });

  it.each(['{', '{"version":2,"type":"CHANNEL"}'])(
    'does not convert invalid registration %s into a legacy lookup',
    async (body) => {
      const fixtures = channelFixtures();
      fixtures.objects!['deployments/sample-app/selectors/next.json'] = { body };
      const { result, calls } = await invoke('origin-request', cloudfrontEvent('/ios/sample-app/1/next'), fixtures);
      expect(result.errorMessage).toContain('Invalid selector registration');
      expect(calls).toHaveLength(1);
    }
  );

  it.each([
    '/ios/sample-app/0/next',
    '/ios/sample-app/1001/next',
    '/ios/sample-app/testers/next',
    '/ios/sample-app/1/next/extra',
  ])('rejects invalid or disabled route %s', async (uri) => {
    expect((await invoke('origin-request', cloudfrontEvent(uri), channelFixtures())).result).toMatchObject({
      status: '400',
    });
  });

  it('preserves response metadata and gzip/cache headers in the deployed origin-response handler', async () => {
    const event = cloudfrontEvent('/channels/next/bundles/sample-app/release/bundle.ios.hbc.gz');
    const cf = event.Records[0]!.cf;
    cf.config.eventType = 'origin-response';
    cf.request.headers = { 'x-bundle': [{ key: 'X-Bundle', value: cf.request.uri }] };
    const response = {
      status: '200',
      headers: {
        'x-amz-meta-x-deployment-id': [{ value: 'release' }],
        'x-amz-meta-x-deployment-deployed-at': [{ value: '2026-01-01T00:00:00Z' }],
        'content-encoding': [{ value: 'gzip' }],
        'cache-control': [{ value: 'max-age=0' }],
      },
    };
    const { result, calls } = await invoke('origin-response', { Records: [{ cf: { ...cf, response } }] });
    expect(result).toMatchObject({
      status: '200',
      headers: {
        'x-deployment-id': [{ key: 'X-Deployment-Id', value: 'release' }],
        'x-deployed-at': [{ key: 'X-Deployed-At', value: '2026-01-01T00:00:00Z' }],
        'content-encoding': [{ value: 'gzip' }],
        'cache-control': [{ value: 'max-age=0' }],
      },
    });
    expect(calls).toEqual([]);
  });

  it('sends real SDK invalidation requests for registration/state events but not bundle/history writes', async () => {
    const event = s3Event([
      'deployments/sample-app/selectors/next.json',
      'channels/next/deployments/sample-app/deployment_state',
      'channels/next/bundles/sample-app/release/bundle.ios.hbc.gz',
      'channels/next/deployments/sample-app/DEPLOYMENTS',
    ]);
    const { result, calls } = await invoke('auto-cache-removal', event);
    expect(result.message).toBe('Successfully processed all records');
    expect(result.results.map(({ invalidated }: { invalidated: boolean }) => invalidated)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.pathname).toMatch(/\/distribution\/sample-distribution\/invalidation$/);
      expect(call.body).toContain('<Path>/ios/sample-app/*</Path>');
      expect(call.body).toContain('<Path>/android/sample-app/*</Path>');
    }
  });

  it('surfaces CloudFront transport errors as failed Lambda invocations and allows a retry', async () => {
    const event = s3Event(['channels/next/deployments/sample-app/deployment_state']);
    expect((await invoke('auto-cache-removal', event, { cloudfrontError: true })).result.errorType).toBeTruthy();
    expect((await invoke('auto-cache-removal', event)).result.message).toBe('Successfully processed all records');
  });

  it('fails without sending an SDK request when the distribution setting is missing', async () => {
    const { result, calls } = await invoke('missing-config', s3Event(['deployments/sample-app/selectors/next.json']));
    expect(result.errorMessage).toContain('CLOUDFRONT_DISTRIBUTION_ID environment variable is not set');
    expect(calls).toEqual([]);
  });
});
