// HTTP-only scenario infrastructure. This adapter models CloudFront event
// delivery/cache completion; all routing, publication and invalidation decisions
// come from the production Forge/deployment-manager code and Lambda artifacts.
const http = require('node:http');
const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { readFile, rm } = require('node:fs/promises');
const { DeployManager, S3Client } = require('./deployment-manager.cjs');

const objects = new Map();
const cache = new Map();
let notifications = [];
let invalidations = [];
let faults = {};
const s3Client = new S3Client({ bucket: 'sample-bucket', region: 'us-east-1' });
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(value));
}

function storageError(response, status, code) {
  response.writeHead(status, { 'Content-Type': 'application/xml' });
  response.end(`<Error><Code>${code}</Code><Message>Scenario storage failure</Message></Error>`);
}

function notify(key, eventName = 'ObjectCreated:Put') {
  notifications.push({
    eventName,
    s3: { bucket: { name: 'sample-bucket' }, object: { key: encodeURIComponent(key) } },
  });
}

async function invoke(name, event) {
  const response = await fetch(`http://${name}:8080/2015-03-31/functions/function/invocations`, {
    method: 'POST',
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json();
  if (result?.errorType) {
    throw new Error(result.errorMessage);
  }
  return result;
}

async function settle() {
  const records = notifications.splice(0);
  try {
    if (records.length) {
      await invoke('auto-cache-removal', { Records: records });
    }
  } catch (error) {
    notifications.unshift(...records);
    throw error;
  }
  for (const path of invalidations.splice(0)) {
    for (const key of cache.keys()) {
      if (path.endsWith('*') ? key.startsWith(path.slice(0, -1)) : key === path) {
        cache.delete(key);
      }
    }
  }
}

async function publish(input) {
  const resultFile = `/tmp/publish-${randomUUID()}.json`;
  try {
    await new Promise((resolve, reject) => {
      const child = execFile(
        '/var/lang/bin/node',
        ['/var/task/publisher.cjs'],
        { timeout: 20_000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || stdout || error.message));
          } else {
            resolve();
          }
        }
      );
      child.stdin.end(JSON.stringify({ ...input, resultFile }));
    });
    return JSON.parse(await readFile(resultFile, 'utf8'));
  } finally {
    await rm(resultFile, { force: true });
  }
}

function rawOriginRequest(path) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:9567/sample-bucket${path}`, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({ status: String(response.statusCode), headers: response.headers, body: Buffer.concat(chunks) })
        );
        response.on('error', reject);
      })
      .on('error', reject);
  });
}

function cfHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key.toLowerCase(),
        (Array.isArray(value) ? value : [value]).map((item) => ({ key, value: String(item) })),
      ])
  );
}

function sendBundle(response, result, hit, method) {
  const headers = Object.fromEntries(
    Object.entries(result.headers ?? {}).map(([key, values]) => [key, values[0].value])
  );
  delete headers['transfer-encoding'];
  delete headers.connection;
  response.writeHead(Number(result.status), { ...headers, 'x-test-cache': hit ? 'HIT' : 'MISS' });
  response.end(method === 'HEAD' ? undefined : result.body);
}

async function serveBundle(request, response, url) {
  const key = url.pathname + url.search;
  if (cache.has(key)) {
    sendBundle(response, cache.get(key), true, request.method);
    return;
  }
  const config = {
    distributionDomainName: 'cdn.example.com',
    distributionId: 'sample',
    eventType: 'origin-request',
    requestId: randomUUID(),
  };
  const routed = await invoke('origin-request', {
    Records: [
      {
        cf: {
          config,
          request: {
            uri: url.pathname,
            querystring: url.search.slice(1),
            method: request.method,
            clientIp: '127.0.0.1',
            headers: cfHeaders(request.headers),
          },
        },
      },
    ],
  });
  let result;
  if (routed.status) {
    result = { ...routed, body: Buffer.from(routed.body ?? '') };
  } else {
    const origin = await rawOriginRequest(routed.uri);
    const translated = await invoke('origin-response', {
      Records: [
        {
          cf: {
            config: { ...config, eventType: 'origin-response' },
            request: routed,
            response: { status: origin.status, headers: cfHeaders(origin.headers) },
          },
        },
      ],
    });
    result = { ...translated, body: origin.body };
  }
  if (['200', '404'].includes(result.status)) {
    cache.set(key, result);
  }
  sendBundle(response, result, false, request.method);
}

function decodeBody(body, encoding) {
  if (!String(encoding).includes('aws-chunked')) {
    return body;
  }
  const chunks = [];
  let offset = 0;
  for (;;) {
    const end = body.indexOf('\r\n', offset);
    const length = Number.parseInt(body.subarray(offset, end).toString().split(';')[0], 16);
    if (end < 0 || !Number.isFinite(length)) {
      throw new Error('Invalid AWS chunked body');
    }
    if (length === 0) {
      return Buffer.concat(chunks);
    }
    offset = end + 2;
    chunks.push(body.subarray(offset, offset + length));
    offset += length + 2;
  }
}

async function control(path, input, response) {
  const context = { s3Client, channel: input.channel };
  switch (path) {
    case '/__test/reset':
      objects.clear();
      cache.clear();
      notifications = [];
      invalidations = [];
      faults = {};
      return json(response, 200, {});
    case '/__test/publish':
      return json(response, 201, await publish(input));
    case '/__test/register':
      await DeployManager.registerChannel({ appName: input.appName, channel: input.channel }, context);
      return json(response, 201, {});
    case '/__test/settle':
      await settle();
      return json(response, 200, {});
    case '/__test/faults':
      faults = input;
      return json(response, 200, {});
    case '/__test/rollout': {
      const current = await DeployManager.readDeploymentState(input.appName, context);
      const state = await DeployManager.planRollout(current, {
        targetDeploymentId: input.deploymentId,
        progress: input.progress,
      });
      await DeployManager.rollout({ appName: input.appName, state }, context);
      return json(response, 200, {
        targetGroup: state.groupIdsCandidate?.[0],
        baselineGroup: state.groupIdsCandidate?.at(-1),
      });
    }
    case '/__test/damage-state': {
      const key = `channels/${input.channel}/deployments/${input.appName}/deployment_state`;
      if (input.kind === 'missing') {
        objects.delete(key);
        notify(key, 'ObjectRemoved:Delete');
      } else {
        await s3Client.putObject(key, { Body: '{' });
      }
      return json(response, 200, {});
    }
    default:
      return json(response, 404, { error: 'Unknown scenario control' });
  }
}

http
  .createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://gateway');
      if (url.pathname === '/__test/ready') {
        await invoke('origin-request', { Records: [] });
        await invoke('auto-cache-removal', { Records: [] });
        return json(response, 200, {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
          uid: process.getuid(),
        });
      }
      const chunks = [];
      for await (const chunk of request) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks);
      if (url.pathname.startsWith('/__test/')) {
        await control(url.pathname, JSON.parse(raw.toString() || '{}'), response);
        return;
      }
      if (request.method === 'POST' && url.pathname.endsWith('/distribution/sample-distribution/invalidation')) {
        if (faults.invalidation) {
          return storageError(response, 403, 'AccessDenied');
        }
        invalidations.push(...[...raw.toString().matchAll(/<Path>(.*?)<\/Path>/g)].map((match) => match[1]));
        response.writeHead(201, { 'Content-Type': 'application/xml' });
        response.end(
          '<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2020-05-31/"><Id>sample-invalidation</Id><Status>InProgress</Status><CreateTime>2026-01-01T00:00:00Z</CreateTime></Invalidation>'
        );
        return;
      }
      if (url.pathname.startsWith('/sample-bucket')) {
        const key = decodeURIComponent(url.pathname.slice('/sample-bucket/'.length));
        if (url.searchParams.get('list-type') === '2') {
          const prefix = url.searchParams.get('prefix') ?? '';
          response.writeHead(200, { 'Content-Type': 'application/xml' });
          response.end(
            `<ListBucketResult><IsTruncated>false</IsTruncated>${[...objects.keys()]
              .filter((value) => value.startsWith(prefix))
              .map((value) => `<Contents><Key>${xml(value)}</Key></Contents>`)
              .join('')}</ListBucketResult>`
          );
          return;
        }
        if (request.method === 'PUT') {
          if (faults.uploadPlatform && key.endsWith(`/bundle.${faults.uploadPlatform}.hbc.gz`)) {
            return storageError(response, 403, 'AccessDenied');
          }
          if (request.headers['if-none-match'] === '*' && objects.has(key)) {
            return storageError(response, 412, 'PreconditionFailed');
          }
          const headers = Object.fromEntries(
            Object.entries(request.headers).filter(
              ([name]) =>
                name.startsWith('x-amz-meta-') || ['cache-control', 'content-type', 'content-encoding'].includes(name)
            )
          );
          if (headers['content-encoding']) {
            headers['content-encoding'] = headers['content-encoding']
              .split(',')
              .filter((value) => value.trim() !== 'aws-chunked')
              .join(',');
            if (!headers['content-encoding']) {
              delete headers['content-encoding'];
            }
          }
          objects.set(key, { body: decodeBody(raw, request.headers['content-encoding']), headers });
          notify(key);
          response.writeHead(200);
          response.end();
          return;
        }
        if (
          faults.readState &&
          key === `channels/${faults.readState.channel}/deployments/${faults.readState.appName}/deployment_state`
        ) {
          return storageError(response, 403, 'AccessDenied');
        }
        const object = objects.get(key);
        if (!object) {
          return storageError(response, 404, 'NoSuchKey');
        }
        response.writeHead(200, { ...object.headers, 'Content-Length': object.body.length });
        response.end(request.method === 'HEAD' ? undefined : object.body);
        return;
      }
      await serveBundle(request, response, url);
    } catch (error) {
      json(response, 502, { error: error.message });
    }
  })
  .listen(9567, '0.0.0.0');
