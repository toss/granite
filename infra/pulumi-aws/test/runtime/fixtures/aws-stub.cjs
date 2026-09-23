// Local HTTP fixtures, not an AWS service emulator. Only the SDK transport is
// redirected; the deployed handler and its bundled AWS SDK remain unchanged.
const http = require('node:http');

let fixtures = {};
let calls = [];

http
  .createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString();
    if (pathname === '/__fixtures') {
      fixtures = JSON.parse(body);
      calls = [];
      response.end('{}');
      return;
    }
    if (pathname === '/__calls') {
      response.end(JSON.stringify(calls));
      return;
    }
    calls.push({ method: request.method, pathname, body });
    if (request.method === 'GET' && pathname.startsWith('/sample-bucket/')) {
      const key = decodeURIComponent(pathname.slice('/sample-bucket/'.length));
      const object = fixtures.objects?.[key];
      if (!object || object.status) {
        response.writeHead(object?.status ?? 404, { 'Content-Type': 'application/xml' });
        response.end(`<Error><Code>${object?.code ?? 'NoSuchKey'}</Code><Message>Fixture error</Message></Error>`);
        return;
      }
      response.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      response.end(object.body);
      return;
    }
    if (request.method === 'POST' && pathname.endsWith('/distribution/sample-distribution/invalidation')) {
      if (fixtures.cloudfrontError) {
        response.writeHead(403, { 'Content-Type': 'application/xml' });
        response.end(
          '<ErrorResponse><Error><Type>Sender</Type><Code>AccessDenied</Code><Message>Fixture error</Message></Error></ErrorResponse>'
        );
        return;
      }
      response.writeHead(201, { 'Content-Type': 'application/xml' });
      response.end(
        '<Invalidation xmlns="http://cloudfront.amazonaws.com/doc/2020-05-31/"><Id>sample-invalidation</Id><Status>InProgress</Status><CreateTime>2026-01-01T00:00:00Z</CreateTime></Invalidation>'
      );
      return;
    }
    response.writeHead(400);
    response.end('Unexpected SDK request');
  })
  .listen(9567, '127.0.0.1');
