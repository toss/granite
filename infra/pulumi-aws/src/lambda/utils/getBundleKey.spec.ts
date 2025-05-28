import { describe, expect, it } from 'vitest';
import { getBundleKey } from './getBundleKey';

describe('getBundleKey', () => {
  it('should correctly generate iOS bundle URL', () => {
    const key = getBundleKey({
      appName: 'my-point',
      platform: 'ios',
      deploymentId: 'abc123',
    });

    expect(key).toBe('bundles/my-point/abc123');
  });

  it('should correctly generate Android bundle URL', () => {
    const key = getBundleKey({
      appName: 'my-point',
      platform: 'android',
      deploymentId: 'def456',
    });

    expect(key).toBe('bundles/my-point/def456');
  });

  it('should correctly generate URL with different suffix', () => {
    const key = getBundleKey({
      appName: 'my-point',
      platform: 'ios',
      deploymentId: 'abc123',
    });

    expect(key).toBe('bundles/my-point/abc123');
  });
});
