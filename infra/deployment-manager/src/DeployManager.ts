import { planRollout } from './planRollout';
import { readBundleList } from './readBundleList';
import { readCluster } from './readCluster';
import { readDeploymentState } from './readDeploymentState';
import { resolveBundle } from './resolveBundle';
import { resolveDeploymentId } from './resolveDeploymentId';
import { rollout } from './rollout';
import { rolloutCluster } from './rolloutCluster';
import { registerChannel, resolveChannel } from './selectorRegistration';
import { updateBundleList } from './updateBundleList';
import { uploadBundle } from './uploadBundle';

export const DeployManager = {
  registerChannel,
  resolveChannel,
  planRollout,
  rollout,
  rolloutCluster,
  readBundleList,
  readDeploymentState,
  readCluster,
  resolveDeploymentId,
  resolveBundle,
  updateBundleList,
  uploadBundle,
};
