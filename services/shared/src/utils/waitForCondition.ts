const INTERVAL_TICK = 100;
const TIMEOUT = 3000;

export async function waitForCondition(waitingTarget: string, predicate: () => boolean) {
  return new Promise<void>((resolve, reject) => {
    const intervalId = setInterval(() => {
      if (predicate()) {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        resolve();
      }
    }, INTERVAL_TICK);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      reject(new Error(`waitForPage timeout: ${waitingTarget}`));
    }, TIMEOUT);
  });
}
