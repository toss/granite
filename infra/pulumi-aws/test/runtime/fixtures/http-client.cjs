// HTTP transport only: no application imports or Lambda event construction.
async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const { path, method = 'GET', body } = JSON.parse(Buffer.concat(chunks).toString());
  const response = await fetch(`http://127.0.0.1:9567${path}`, {
    method,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });
  console.log(
    JSON.stringify({
      status: response.status,
      headers: [...response.headers],
      body: Buffer.from(await response.arrayBuffer()).toString('base64'),
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
