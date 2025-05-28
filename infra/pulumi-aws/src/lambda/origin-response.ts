import { InvalidRequest } from '@granite-js/deployment-manager';
import { CloudFrontResponseEvent, CloudFrontResponseResult } from 'aws-lambda';

export function createOriginRequestHandler() {
  return async function handler(event: CloudFrontResponseEvent): Promise<CloudFrontResponseResult> {
    const request = event.Records[0]?.cf?.request;
    const response = event.Records[0]?.cf?.response;
    if (request == null || response == null) {
      throw new InvalidRequest('invalid request');
    }

    const bundleUrl = request.headers['x-bundle']?.[0]?.value;
    if (bundleUrl == null) {
      return response;
    }

    const deploymentId = response.headers['x-amz-meta-x-deployment-id']?.[0]?.value;
    if (deploymentId != null) {
      response.headers['x-deployment-id'] = [
        {
          key: 'X-Deployment-Id',
          value: deploymentId,
        },
      ];
    }

    const deployedAt = response.headers['x-amz-meta-x-deployment-deployed-at']?.[0]?.value;
    if (deployedAt != null) {
      response.headers['x-deployed-at'] = [
        {
          key: 'X-Deployed-At',
          value: deployedAt,
        },
      ];
    }

    return response;
  };
}

const handler = createOriginRequestHandler();

export { handler };
