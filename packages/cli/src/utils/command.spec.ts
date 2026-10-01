import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from './command';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('errorHandler', () => {
  it('prints the causes of nested aggregate errors', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cause = new Error("Could not resolve 'missing-module'");
    const error = new AggregateError(
      [new Error('Failed to build for ios', { cause: new AggregateError([cause], 'Build failed') })],
      'Granite build failed'
    );

    expect(errorHandler(error)).toBe(1);
    expect(log.mock.calls.map(([, message]) => message)).toEqual([
      'Granite build failed',
      'Failed to build for ios',
      'Build failed',
      "Could not resolve 'missing-module'",
    ]);
  });

  it('handles circular causes and repeated errors', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new AggregateError([], 'Build failed');
    error.errors.push(error, new Error('Original failure'), error);
    error.cause = error;

    expect(errorHandler(error)).toBe(1);
    expect(log.mock.calls.map(([, message]) => message)).toEqual(['Build failed', 'Original failure']);
  });

  it('preserves non-Error rejection details', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reason = { code: 'RESOLVE_ERROR', message: 'Missing dependency' };

    expect(errorHandler(new AggregateError(['failure', reason, null], 'Build failed'))).toBe(1);
    expect(log).toHaveBeenCalledWith(expect.any(String), 'Unknown error', 'failure');
    expect(log).toHaveBeenCalledWith(expect.any(String), 'Unknown error', reason);
    expect(log).toHaveBeenCalledWith(expect.any(String), 'Unknown error', '');
  });
});
