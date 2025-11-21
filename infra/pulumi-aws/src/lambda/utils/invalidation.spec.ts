import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { noop } from 'es-toolkit';
import { describe, it, expect, vi } from 'vitest';
import { getPathsToInvalidate } from './invalidation';

const classes = {
  CloudFrontClient,
  CreateInvalidationCommand,
};

vi.spyOn(classes, 'CloudFrontClient').mockImplementation(() => ({
  send: vi.fn(),
}));

vi.spyOn(classes, 'CreateInvalidationCommand').mockImplementation(noop);

describe('invalidation', () => {
  describe('getPathsToInvalidate', () => {
    it('returns invalidation paths for deployment_state file', () => {
      const paths = getPathsToInvalidate('deployments/my-app/deployment_state');
      expect(paths).toEqual(['/ios/my-app/*', '/android/my-app/*']);
    });

    it('returns invalidation paths for CURRENT file', () => {
      const paths = getPathsToInvalidate('deployments/my-app/CURRENT');
      expect(paths).toEqual(['/ios/my-app/*', '/android/my-app/*']);
    });

    it('returns invalidation paths for cluster deploymentInfo file', () => {
      const paths = getPathsToInvalidate('deployments/my-app/clusters/cluster-123.deploymentInfo');
      expect(paths).toEqual(['/ios/my-app/cluster-123/*', '/android/my-app/cluster-123/*']);
    });

    it('returns empty array for invalid paths', () => {
      expect(getPathsToInvalidate('wrong-path')).toEqual([]);
      expect(getPathsToInvalidate('deployments/my-app/wrong-file')).toEqual([]);
    });
  });
});
