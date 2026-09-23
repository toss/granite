const { setTimeout: delay } = require('node:timers/promises');

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const options = { method: 'POST', body: JSON.stringify(input.fixtures ?? {}) };
  for (let attempt = 0; ; attempt++) {
    try {
      await fetch('http://127.0.0.1:9567/__fixtures', { ...options, signal: AbortSignal.timeout(1000) });
      break;
    } catch (error) {
      if (attempt >= 50) {
        throw error;
      }
      await delay(100);
    }
  }
  const response = await fetch('http://127.0.0.1:8080/2015-03-31/functions/function/invocations', {
    method: 'POST',
    body: JSON.stringify(input.event),
    signal: AbortSignal.timeout(20_000),
  });
  const calls = await fetch('http://127.0.0.1:9567/__calls');
  console.log(JSON.stringify({ result: await response.json(), calls: await calls.json() }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
