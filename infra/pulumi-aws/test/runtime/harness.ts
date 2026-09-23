import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'tsup';
import { createLambdaSource } from '../../src/lambda-code';

const image = 'public.ecr.aws/lambda/nodejs:22';
const require = createRequire(import.meta.url);

function docker(args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile('docker', args, { timeout: 60_000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`docker ${args[0]} failed: ${stderr || error.message}`));
      } else {
        resolve((args[0] === 'logs' ? stdout + stderr : stdout).trim());
      }
    });
    child.stdin?.end(input);
  });
}

export async function startHTTPScenario() {
  const directory = await mkdtemp(join(tmpdir(), 'lambda-http-'));
  const containers: string[] = [];
  const images = new Set<string>();
  let network: string | undefined;
  let gatewayId: string | undefined;

  async function close() {
    const results = await Promise.allSettled(containers.map((id) => docker(['rm', '--force', id])));
    results.push(...(await Promise.allSettled([...images].map((id) => docker(['image', 'rm', id])))));
    if (network) {
      results.push(...(await Promise.allSettled([docker(['network', 'rm', network])])));
    }
    await rm(directory, { recursive: true, force: true });
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') {
      throw failed.reason;
    }
  }

  async function prepare(name: string, files: string) {
    const staging = await docker(['create', '--platform', 'linux/amd64', '--network', 'none', image, 'index.handler']);
    containers.push(staging);
    await docker(['cp', `${files}/.`, `${staging}:/var/task`]);
    const prepared = await docker(['commit', staging]);
    images.add(prepared);
    return { name, image: prepared };
  }

  async function start(prepared: { name: string; image: string }, endpoint: string, gateway = false) {
    const container = await docker([
      'create',
      '--platform',
      'linux/amd64',
      '--network',
      network!,
      '--network-alias',
      prepared.name,
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
      `AWS_ENDPOINT_URL_S3=${endpoint}`,
      '--env',
      `AWS_ENDPOINT_URL_CLOUDFRONT=${endpoint}`,
      '--env',
      'CLOUDFRONT_DISTRIBUTION_ID=sample-distribution',
      ...(gateway ? ['--entrypoint', '/var/lang/bin/node'] : []),
      prepared.image,
      gateway ? '/var/task/gateway.cjs' : 'index.handler',
    ]);
    containers.push(container);
    await docker(['start', container]);
    return container;
  }

  try {
    await docker(['image', 'inspect', image]).catch(() => {
      throw new Error(`Pull the official runtime first: docker pull --platform linux/amd64 ${image}`);
    });
    network = await docker(['network', 'create', '--internal', `lambda-http-${randomUUID()}`]);
    const [networkConfig] = JSON.parse(await docker(['network', 'inspect', network]));
    if (!networkConfig.Internal) {
      throw new Error('Scenario network must block external routing');
    }

    const gatewayFiles = join(directory, 'gateway');
    await mkdir(gatewayFiles);
    await copyFile(
      fileURLToPath(new URL('./fixtures/http-client.cjs', import.meta.url)),
      join(gatewayFiles, 'http-client.cjs')
    );
    await copyFile(
      fileURLToPath(new URL('./fixtures/gateway.cjs', import.meta.url)),
      join(gatewayFiles, 'gateway.cjs')
    );
    await copyFile(require.resolve('@granite-js/deployment-manager'), join(gatewayFiles, 'deployment-manager.cjs'));
    await build({
      entry: { publisher: fileURLToPath(new URL('./fixtures/publish.ts', import.meta.url)) },
      outDir: gatewayFiles,
      format: ['cjs'],
      outExtension: () => ({ js: '.cjs' }),
      platform: 'node',
      target: 'node22',
      noExternal: [/.*/],
      splitting: false,
      silent: true,
      config: false,
    });
    const gateway = await start(await prepare('gateway', gatewayFiles), 'http://127.0.0.1:9567', true);
    gatewayId = gateway;
    const [gatewayConfig] = JSON.parse(await docker(['inspect', gateway]));
    const address = (Object.values(gatewayConfig.NetworkSettings.Networks)[0] as { IPAddress: string }).IPAddress;

    for (const name of ['origin-request', 'origin-response', 'auto-cache-removal']) {
      const files = join(directory, name);
      await mkdir(files);
      const source = createLambdaSource({
        sourcePath: require.resolve(`@granite-js/pulumi-aws/lambda/${name}`),
        bucketName: 'sample-bucket',
        region: 'us-east-1',
      });
      await writeFile(join(files, 'index.js'), source);
      const container = await start(await prepare(name, files), `http://${address}:9567`);
      const hash = await docker([
        'exec',
        container,
        '/var/lang/bin/node',
        '-e',
        "console.log(require('node:crypto').createHash('sha256').update(require('node:fs').readFileSync('/var/task/index.js')).digest('hex'))",
      ]);
      if (hash !== createHash('sha256').update(source).digest('hex')) {
        throw new Error(`${name} artifact does not match the production archive source`);
      }
    }

    async function request(path: string, options: { method?: string; body?: unknown } = {}) {
      const raw = await docker(
        ['exec', '-i', gateway, '/var/lang/bin/node', '/var/task/http-client.cjs'],
        JSON.stringify({ path, ...options })
      );
      const result = JSON.parse(raw) as { status: number; headers: [string, string][]; body: string };
      return new Response(Buffer.from(result.body, 'base64'), { status: result.status, headers: result.headers });
    }
    let lastError: unknown;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const response = await request('/__test/ready');
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const runtime = (await response.json()) as { version: string; platform: string; arch: string; uid: number };
        if (
          !runtime.version.startsWith('v22.') ||
          runtime.platform !== 'linux' ||
          runtime.arch !== 'x64' ||
          runtime.uid !== 1000
        ) {
          throw new Error('Scenario is not running in the expected Lambda Node 22 environment');
        }
        console.log('HTTP scenario runtime:', runtime);
        return { request, close };
      } catch (error) {
        lastError = error;
        await delay(250);
      }
    }
    throw lastError;
  } catch (error) {
    if (gatewayId) {
      console.error('Scenario gateway logs:', await docker(['logs', '--tail', '30', gatewayId]));
    }
    await close();
    throw error;
  }
}
