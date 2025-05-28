import { describe, it, expect } from 'vitest';
import { extractAppName, extractClusterId, isCurrentFile, isClusterDeploymentInfoFile } from './pathParser';

describe('pathParser', () => {
  describe('extractAppName', () => {
    it('extracts app name from valid path', () => {
      expect(extractAppName('deployments/my-app/CURRENT')).toBe('my-app');
      expect(extractAppName('deployments/my-app/clusters/cluster-123.deploymentInfo')).toBe('my-app');
    });

    it('returns null for invalid paths', () => {
      expect(extractAppName('wrong/my-app/CURRENT')).toBeNull();
      expect(extractAppName('my-app/CURRENT')).toBeNull();
    });
  });

  describe('extractClusterId', () => {
    it('extracts cluster ID from valid path', () => {
      expect(extractClusterId('deployments/my-app/clusters/cluster-123.deploymentInfo')).toBe('cluster-123');
    });

    it('returns null for invalid paths', () => {
      expect(extractClusterId('deployments/my-app/CURRENT')).toBeNull();
      expect(extractClusterId('deployments/my-app/clusters/file.txt')).toBeNull();
    });
  });

  describe('isCurrentFile', () => {
    it('correctly identifies CURRENT file path', () => {
      expect(isCurrentFile('deployments/my-app/CURRENT')).toBe(true);
    });

    it('returns false for non-CURRENT file paths', () => {
      expect(isCurrentFile('deployments/my-app/clusters/cluster-123.deploymentInfo')).toBe(false);
      expect(isCurrentFile('deployments/my-app/OTHER')).toBe(false);
    });
  });

  describe('isClusterDeploymentInfoFile', () => {
    it('correctly identifies cluster deploymentInfo file path', () => {
      expect(isClusterDeploymentInfoFile('deployments/my-app/clusters/cluster-123.deploymentInfo')).toBe(true);
    });

    it('returns false for non-cluster deploymentInfo file paths', () => {
      expect(isClusterDeploymentInfoFile('deployments/my-app/CURRENT')).toBe(false);
      expect(isClusterDeploymentInfoFile('deployments/my-app/clusters/file.txt')).toBe(false);
    });
  });
});
