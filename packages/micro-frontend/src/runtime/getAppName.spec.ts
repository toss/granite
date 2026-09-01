import { describe, expect, it } from 'vitest';
import { resolveAppNameBySourceURL, resolveAppNameFromStackFrames } from './getAppName';
import type { AppContainer } from './registry';
import type { RuntimeStackFrame } from './runtimeSourceURL';

function createContainer(appName: string, sourceURL: string): AppContainer {
  return { appName, config: {}, exposedModules: {}, runtime: { sourceURL } };
}

describe('resolveAppNameFromStack', () => {
  it('resolves the first caller container', () => {
    const frames: RuntimeStackFrame[] = [
      { sourceURL: 'https://cdn.example.com/remote-app.hbc' },
      { sourceURL: 'file:///host-app.hbc' },
    ];
    const containers = {
      host: createContainer('host-app', 'file:///host-app.hbc'),
      remote: createContainer('remote-app', 'https://cdn.example.com/remote-app.hbc'),
    };

    expect(resolveAppNameFromStackFrames(frames, containers)).toBe('remote-app');
  });

  it('returns the host app name when called from the host bundle', () => {
    const frames: RuntimeStackFrame[] = [{ sourceURL: 'file:///host-app.hbc' }];
    const containers = { host: createContainer('host-app', 'file:///host-app.hbc') };

    expect(resolveAppNameFromStackFrames(frames, containers)).toBe('host-app');
  });

  it('throws when no caller frame matches a registered container', () => {
    const frames: RuntimeStackFrame[] = [{ sourceURL: 'file:///unknown.hbc' }];
    const containers = { host: createContainer('host-app', 'file:///host-app.hbc') };

    expect(() => resolveAppNameFromStackFrames(frames, containers)).toThrow('app name');
  });
});

describe('resolveAppNameBySourceURL', () => {
  it('returns the app name for an exact sourceURL match', () => {
    const containers = { remote: createContainer('remote-app', 'https://cdn.example.com/remote-app.hbc') };

    expect(resolveAppNameBySourceURL('https://cdn.example.com/remote-app.hbc', containers)).toBe('remote-app');
  });

  it('returns null for an unknown sourceURL', () => {
    const containers = { host: createContainer('host-app', 'file:///host-app.hbc') };

    expect(resolveAppNameBySourceURL('file:///unknown.hbc', containers)).toBeNull();
  });

  it('returns null when a sourceURL belongs to different apps', () => {
    const containers = {
      first: createContainer('first-app', 'file:///same.hbc'),
      second: createContainer('second-app', 'file:///same.hbc'),
    };

    expect(resolveAppNameBySourceURL('file:///same.hbc', containers)).toBeNull();
  });
});
