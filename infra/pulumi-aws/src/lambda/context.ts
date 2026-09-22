import type { PathChannelRoutes } from '../pathChannelRoutes';

interface BaseContext {
  bucketName: string;
  region: string;
}

export interface RequestHandlerContext extends BaseContext {
  allowAccessCluster: boolean;
  pathChannelRoutes?: PathChannelRoutes;
}

export type ResponseHandlerContext = BaseContext;
