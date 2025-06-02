import { randomUUID } from 'crypto';
import { describe, it, expect } from 'vitest';
import { extractSentryDebugId } from './extractSentryDebugId';

describe('extractSentryDebugId', () => {
  it('should extract the Sentry debug ID from the bundle content', () => {
    const dummyDebugId = randomUUID();
    const debugId = extractSentryDebugId(`
      // SENTRY_DEBUG_ID=${dummyDebugId}
      console.log('Hello, world!');
    `);

    expect(debugId).toBe(dummyDebugId);
  });
});
