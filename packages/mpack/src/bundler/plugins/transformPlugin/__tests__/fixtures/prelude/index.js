if (globalThis.__initialized) {
  console.log('passed!');
} else {
  throw new Error('not initialized');
}
