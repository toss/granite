import { string, object, literal, array, number, union, InferOutput } from 'valibot';

const deploymentIdSchema = string();
export type DeploymentId = InferOutput<typeof deploymentIdSchema>; // @example 'bc176aa16a35cd2f4e34e9fcfc8797b1c97a1bc3'

const pendingDeploymentState = object({
  type: literal('PENDING'),
});
export type PendingDeploymentState = InferOutput<typeof pendingDeploymentState>;

const stableDeploymentState = object({
  type: literal('STABLE'),
  deploymentId: deploymentIdSchema,
});
export type StableDeploymentState = InferOutput<typeof stableDeploymentState>;

const canaryDeploymentState = object({
  type: literal('CANARY'),
  /**
   * Array of values in range 1 ~ 1000
   *
   * Creates a shuffled array at the first canary deployment and maintains the initially generated groupId
   * to ensure the same user stays in the same canary group.
   * (This ensures that existing groups are maintained even when the canary deployment rate changes)
   *
   * @example ['1', '589', '79', ..., '105']
   */
  groupIdsCandidate: array(string()),
  deploymentId: object({
    /**
     * deploymentId of the version deployed before canary deployment
     */
    old: deploymentIdSchema,
    /**
     * deploymentId of the version currently being canary deployed
     */
    target: deploymentIdSchema,
  }),
  progress: object({
    /**
     * Previous canary deployment rate
     */
    previous: number(),
    /**
     * Current canary deployment rate
     */
    current: number(),
  }),
});
export type CanaryDeploymentState = InferOutput<typeof canaryDeploymentState>;

export const clusterDeploymentInfo = object({
  deploymentId: deploymentIdSchema,
});
export type ClusterDeploymentInfo = InferOutput<typeof clusterDeploymentInfo>;

export const deploymentState = union([pendingDeploymentState, stableDeploymentState, canaryDeploymentState]);
export type DeploymentState = InferOutput<typeof deploymentState>;

export interface DeploymentInfo {
  deploymentId: DeploymentId;
  deployedAt: number;
}
