import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deploy } from './deploy';
import { deployList } from './deployList';

const mocks = vi.hoisted(() => ({ deploy: vi.fn(), deployList: vi.fn(), credentials: vi.fn(), loadConfig: vi.fn() }));
vi.mock('@aws-sdk/credential-providers', () => ({ fromNodeProviderChain: () => mocks.credentials }));
vi.mock('@aws-sdk/shared-ini-file-loader', () => ({
  loadSharedConfigFiles: async () => ({ configFile: { default: { region: 'us-east-1' } } }),
}));
vi.mock('@granite-js/plugin-core', () => ({ loadConfig: mocks.loadConfig }));
vi.mock('../operations/deploy', () => ({ deploy: mocks.deploy }));
vi.mock('../operations/deployList', () => ({ deployList: mocks.deployList }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.credentials.mockResolvedValue({ accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key' });
  mocks.loadConfig.mockResolvedValue({ appName: 'sample-app', outdir: 'dist' });
});

describe('channel options', () => {
  const deployArgs = ['--bucket', 'sample-bucket'];
  const listArgs = [
    '--bucket',
    'sample-bucket',
    '--region',
    'us-east-1',
    '--access-key-id',
    'test-access-key',
    '--secret-access-key',
    'test-secret-key',
    '--app-name',
    'sample-app',
  ];

  it.each([undefined, 'Preview_2'])('passes deploy channel %j to the operation', async (channel) => {
    await deploy().parseAsync([...deployArgs, ...(channel ? ['--channel', channel] : [])], { from: 'user' });
    expect(mocks.deploy).toHaveBeenCalledWith(
      expect.objectContaining({ appName: 'sample-app' }),
      expect.objectContaining({ channel })
    );
  });

  it.each([undefined, 'Preview_2'])('passes deploy-list channel %j to the operation', async (channel) => {
    await deployList().parseAsync([...listArgs, ...(channel ? ['--channel', channel] : [])], { from: 'user' });
    expect(mocks.deployList).toHaveBeenCalledWith(
      expect.objectContaining({ appName: 'sample-app' }),
      expect.objectContaining({ channel })
    );
  });

  it('rejects an invalid channel before config loading, credential discovery or either operation', async () => {
    await expect(deploy().parseAsync([...deployArgs, '--channel', '../stable'], { from: 'user' })).rejects.toThrow(
      'Channel must'
    );
    await expect(deployList().parseAsync([...listArgs, '--channel', ''], { from: 'user' })).rejects.toThrow(
      'Channel must'
    );
    expect(mocks.loadConfig).not.toHaveBeenCalled();
    expect(mocks.credentials).not.toHaveBeenCalled();
    expect(mocks.deploy).not.toHaveBeenCalled();
    expect(mocks.deployList).not.toHaveBeenCalled();
  });
});
