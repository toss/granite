import { describe, expect, it } from 'vitest';
import { parseReleaseProfilerCliArgs } from './cli-args';

describe('parseReleaseProfilerCliArgs', () => {
  it('starts with default host and port without bundle arguments', () => {
    expect(parseReleaseProfilerCliArgs([])).toEqual({
      host: 'localhost',
      port: 8081,
    });
  });

  it('allows host and port overrides', () => {
    expect(parseReleaseProfilerCliArgs(['--host', '0.0.0.0', '--port', '9090'])).toEqual({
      host: '0.0.0.0',
      port: 9090,
    });
  });

  it('rejects positional bundle or sourcemap arguments', () => {
    expect(() => parseReleaseProfilerCliArgs(['dist/bundle.ios.hbc'])).toThrow(/Unknown argument/);
  });
});
