import { DeployManager, S3Client } from '@granite-js/deployment-manager';
import { afterEach, expect, it, vi } from 'vitest';
import { deployList } from './deployList';

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: { info: vi.fn(), error: vi.fn() },
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
}));
afterEach(() => vi.restoreAllMocks());

it('lists only the requested channel history', async () => {
  const s3Client = new S3Client({ bucket: 'sample-bucket' });
  const readBundleList = vi.spyOn(DeployManager, 'readBundleList').mockResolvedValue([]);
  const context = { s3Client, channel: 'preview' };
  await deployList({ appName: 'sample-app' }, context);
  expect(readBundleList).toHaveBeenCalledExactlyOnceWith('sample-app', context);
  s3Client.destroy();
});
