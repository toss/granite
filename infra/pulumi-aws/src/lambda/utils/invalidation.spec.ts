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
    it('invalidates cached legacy selectors when a channel is registered', () => {
      expect(getPathsToInvalidate('deployments/sample-app/selectors/next.json')).toEqual([
        '/ios/sample-app/*',
        '/android/sample-app/*',
      ]);
    });
    it.each(['deployment_state', 'CURRENT'])('invalidates the app selectors across channels for %s', (filename) => {
      expect(getPathsToInvalidate(`channels/preview/deployments/sample-app/${filename}`)).toEqual([
        '/ios/sample-app/*',
        '/android/sample-app/*',
      ]);
    });

    it('limits cluster invalidation to that cluster across channels', () => {
      expect(getPathsToInvalidate('channels/Preview_2/deployments/sample-app/clusters/testers.deploymentInfo')).toEqual(
        ['/ios/sample-app/testers/*', '/android/sample-app/testers/*']
      );
    });

    it.each([
      'channels/../deployments/sample-app/deployment_state',
      'channels//deployments/sample-app/deployment_state',
      'channels/a%2Fb/deployments/sample-app/deployment_state',
      'channels/preview/bundles/sample-app/release/bundle.ios.hbc.gz',
      'channels/preview/deployments/sample-app/DEPLOYMENTS',
    ])('ignores invalid channels and objects that do not select deployments: %s', (key) => {
      expect(getPathsToInvalidate(key)).toEqual([]);
    });

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
