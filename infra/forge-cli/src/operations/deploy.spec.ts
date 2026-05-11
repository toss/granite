import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deploy } from './deploy';

type PromptTask = {
  task: () => unknown | Promise<unknown>;
};

const promptMocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  intro: vi.fn(),
  isCancel: vi.fn(),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  outro: vi.fn(),
  spinner: vi.fn(),
  tasks: vi.fn(),
}));

const deploymentMocks = vi.hoisted(() => {
  class NoSuchKey extends Error {}

  return {
    DeployManager: {
      planRollout: vi.fn(),
      readDeploymentState: vi.fn(),
      rollout: vi.fn(),
      updateBundleList: vi.fn(),
      uploadBundle: vi.fn(),
    },
    NoSuchKey,
  };
});

const utilityMocks = vi.hoisted(() => ({
  generateDeploymentId: vi.fn(),
  gzipFile: vi.fn(),
}));

vi.mock('@clack/prompts', () => promptMocks);
vi.mock('@granite-js/deployment-manager', () => ({
  ...deploymentMocks,
  DeploymentState: undefined,
}));
vi.mock('../utils/generateDeploymentId', () => ({
  generateDeploymentId: utilityMocks.generateDeploymentId,
}));
vi.mock('../utils/gzip', () => ({
  gzipFile: utilityMocks.gzipFile,
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitFor(assertion: () => void) {
  let lastError: unknown;

  for (let i = 0; i < 50; i++) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await flushPromises();
    }
  }

  throw lastError;
}

const deployConfig = {
  androidBundle: 'bundle.android.hbc',
  appName: 'test-app',
  iosBundle: 'bundle.ios.hbc',
};

const deployContext = {
  s3Client: {} as never,
};

describe('deploy operation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    promptMocks.confirm.mockResolvedValue(true);
    promptMocks.isCancel.mockReturnValue(false);
    promptMocks.spinner.mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
    });
    promptMocks.tasks.mockImplementation(async (tasks: PromptTask[]) => {
      return Promise.all(tasks.map((task) => task.task()));
    });

    deploymentMocks.DeployManager.readDeploymentState.mockResolvedValue(null);
    deploymentMocks.DeployManager.planRollout.mockResolvedValue({
      deploymentId: 'deployment-id',
      type: 'STABLE',
    });
    deploymentMocks.DeployManager.updateBundleList.mockResolvedValue(undefined);
    deploymentMocks.DeployManager.rollout.mockResolvedValue(undefined);

    utilityMocks.generateDeploymentId.mockReturnValue('deployment-id');
    utilityMocks.gzipFile.mockResolvedValue(undefined);
  });

  it('does not update bundle list or rollout before both uploads resolve', async () => {
    const androidUpload = createDeferred<void>();
    const iosUpload = createDeferred<void>();

    deploymentMocks.DeployManager.uploadBundle.mockImplementation(
      ({ platform }: { platform: 'android' | 'ios' }) => {
        if (platform === 'android') {
          return androidUpload.promise;
        }
        if (platform === 'ios') {
          return iosUpload.promise;
        }
        throw new Error(`Unexpected platform: ${platform}`);
      }
    );

    const deployPromise = deploy(deployConfig, deployContext);

    await waitFor(() => {
      expect(deploymentMocks.DeployManager.uploadBundle).toHaveBeenCalledTimes(2);
    });

    expect(deploymentMocks.DeployManager.updateBundleList).not.toHaveBeenCalled();
    expect(deploymentMocks.DeployManager.rollout).not.toHaveBeenCalled();

    androidUpload.resolve();
    await flushPromises();

    expect(deploymentMocks.DeployManager.updateBundleList).not.toHaveBeenCalled();
    expect(deploymentMocks.DeployManager.rollout).not.toHaveBeenCalled();

    iosUpload.resolve();

    await deployPromise;

    expect(deploymentMocks.DeployManager.updateBundleList).toHaveBeenCalledTimes(1);
    expect(deploymentMocks.DeployManager.rollout).toHaveBeenCalledTimes(1);

    const updateOrder = deploymentMocks.DeployManager.updateBundleList.mock.invocationCallOrder[0];
    const rolloutOrder = deploymentMocks.DeployManager.rollout.mock.invocationCallOrder[0];

    expect(updateOrder).toBeDefined();
    expect(rolloutOrder).toBeDefined();
    expect(updateOrder!).toBeLessThan(rolloutOrder!);
  });

  it('prevents bundle list update and rollout when an upload rejects', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });
    const androidUpload = createDeferred<void>();
    const iosUpload = createDeferred<void>();

    androidUpload.promise.catch(() => undefined);
    deploymentMocks.DeployManager.uploadBundle.mockImplementation(
      ({ platform }: { platform: 'android' | 'ios' }) => {
        if (platform === 'android') {
          return androidUpload.promise;
        }
        if (platform === 'ios') {
          return iosUpload.promise;
        }
        throw new Error(`Unexpected platform: ${platform}`);
      }
    );

    const deployPromise = deploy(deployConfig, deployContext);

    await waitFor(() => {
      expect(deploymentMocks.DeployManager.uploadBundle).toHaveBeenCalledTimes(2);
    });

    androidUpload.reject(new Error('upload failed'));
    iosUpload.resolve();

    await expect(deployPromise).rejects.toThrow('process.exit:1');

    expect(promptMocks.log.error).toHaveBeenCalledWith('upload failed');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(deploymentMocks.DeployManager.updateBundleList).not.toHaveBeenCalled();
    expect(deploymentMocks.DeployManager.rollout).not.toHaveBeenCalled();
  });
});
