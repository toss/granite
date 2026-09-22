interface BaseContext {
  bucketName: string;
  region: string;
}

export interface RequestHandlerContext extends BaseContext {
  allowAccessCluster: boolean;
}

export type ResponseHandlerContext = BaseContext;
