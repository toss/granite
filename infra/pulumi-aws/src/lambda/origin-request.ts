import { DeployManager, S3Client, InvalidRequest, NotFoundError, NoSuchKey } from '@granite-js/deployment-manager';
import { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';
import { parsePathChannelRoutes, type PathChannelRoutes } from '../pathChannelRoutes';
import { RequestHandlerContext } from './context';
import { parseAppName } from './utils/parseAppName';
import { parseGroupId } from './utils/parseGroupId';
import { parsePlatform } from './utils/parsePlatform';
import { parseSuffix } from './utils/parseSuffix';

// https://cdn.example.com/<ios|android>/<appName>/<groupId>/0_72_6 -> s3://<bucketName>/bundles/<appName>/<deploymentId>/bundle.<ios|android>.0_72_6.hbc.gz
export function createOriginRequestHandler(context: RequestHandlerContext) {
  const pathChannels = parsePathChannelRoutes(context.pathChannelRoutes);
  const s3Client = new S3Client({
    bucket: context.bucketName,
    region: context.region,
  });

  return async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
    try {
      const request = event.Records[0]?.cf?.request;
      if (request == null) {
        throw new InvalidRequest('request is null');
      }

      const appName = parseAppName(request.uri);
      const platform = parsePlatform(request.uri);
      const groupId = parseGroupId(request.uri);
      const suffix = parseSuffix(request.uri);

      if (appName == null || platform == null || groupId == null) {
        throw new InvalidRequest('invalid request');
      }

      const isPathChannel = pathChannels.get(appName)?.has(suffix) === true;
      const channel = isPathChannel ? suffix : undefined;
      const tag = isPathChannel || suffix === 'bundle' ? undefined : suffix;
      if (channel !== undefined) {
        const parts = request.uri.split('/');
        if (
          parts.length !== 5 ||
          !['ios', 'android'].includes(parts[1] ?? '') ||
          parts.slice(2).some((part) => !part)
        ) {
          throw new InvalidRequest('Expected /<platform>/<app>/<group>/<selector>');
        }
      }

      const deploymentId = await DeployManager.resolveDeploymentId(
        {
          appName,
          groupId,
          allowAccessCluster: context.allowAccessCluster,
        },
        {
          s3Client,
          channel,
        }
      );

      const bundlePath = DeployManager.resolveBundle({
        appName,
        platform,
        deploymentId,
        channel,
        tag,
      });

      const absolutePath = `/${bundlePath}`;
      request.uri = absolutePath;
      request.headers['x-bundle'] = [
        {
          key: 'X-Bundle',
          value: absolutePath,
        },
      ];
      return request;
    } catch (error) {
      if (error instanceof NoSuchKey) {
        return { status: '404', statusDescription: 'Deployment not found' };
      }
      if (error instanceof NotFoundError) {
        return { status: '404', statusDescription: error.message };
      }

      if (error instanceof InvalidRequest) {
        return { status: '400', statusDescription: error.message };
      }

      throw error;
    }
  };
}

declare const _BUCKET_NAME: string;
declare const _BUCKET_REGION: string;
declare const _PATH_CHANNEL_ROUTES: PathChannelRoutes;

const handler = createOriginRequestHandler({
  allowAccessCluster: false,
  bucketName: _BUCKET_NAME,
  region: _BUCKET_REGION,
  pathChannelRoutes: typeof _PATH_CHANNEL_ROUTES === 'undefined' ? {} : _PATH_CHANNEL_ROUTES,
});

export { handler };
