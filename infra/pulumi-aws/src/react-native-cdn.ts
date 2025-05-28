import fs from 'fs';
import path from 'path';
import { getPackageRoot } from '@granite-js/utils';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { transform } from 'oxc-transform';
import { v7 as uuidv7 } from 'uuid';
import { getTimestampByUUIDv7, toDeployedAtString } from './utils/getTimestampByUUIDv7';

/**
 * Arguments for creating a React Native CDN infrastructure
 * @interface ReactNativeCdnArgs
 * @property {string} bucketName - Name of the S3 bucket (e.g. 'my-app')
 * @property {aws.Region} region - AWS region (e.g. 'ap-northeast-2')
 */
export interface ReactNativeCdnArgs {
  /** Name of the S3 bucket (e.g. 'my-app') */
  bucketName: string;
  /** AWS region (e.g. 'ap-northeast-2') */
  region: aws.Region;
}

const createLambdaCode = (
  path: string,
  {
    bucketName,
    region,
  }: {
    bucketName: string;
    region: string;
  }
) => {
  const code = fs.readFileSync(path, 'utf8');
  const { code: transformedCode } = transform(path, code, {
    define: {
      _BUCKET_NAME: JSON.stringify(bucketName),
      _BUCKET_REGION: JSON.stringify(region),
    },
  });
  return new pulumi.asset.AssetArchive({
    'index.js': new pulumi.asset.StringAsset(transformedCode),
  });
};

export class ReactNativeBundleCDN extends pulumi.ComponentResource {
  public readonly cloudfrontDistributionId: pulumi.Output<string>;
  public readonly cloudfrontOriginAccessIdentityArn: pulumi.Output<string>;
  public readonly bucketName: pulumi.Output<string>;
  public readonly bucketEndpoint: pulumi.Output<string>;
  public readonly cloudfrontDomain: pulumi.Output<string>;
  public readonly monitoringSubscriptionId: pulumi.Output<string>;
  public readonly sharedDeploymentId: pulumi.Output<string>;

  constructor(name: string, args: ReactNativeCdnArgs, opts?: pulumi.ComponentResourceOptions) {
    super('granite:aws:ReactNativeBundleCDN', name, {}, opts);

    // Extract args with defaults
    const { bucketName, region } = args;

    // Create resource name
    const resourceName = bucketName;

    // Main AWS provider
    const awsProvider = new aws.Provider(
      'awsProvider',
      {
        region,
      },
      { parent: this }
    );

    // US-East-1 provider for CloudFront and Lambda@Edge
    const usEast1Provider = new aws.Provider(
      'usEast1Provider',
      {
        region: 'us-east-1',
      },
      { parent: this }
    );

    // S3 Bucket
    const bucket = new aws.s3.Bucket(
      'bucket',
      {
        bucket: resourceName,
        acl: 'private',
        versioning: {
          enabled: true,
        },
        website: {
          indexDocument: 'index.html',
          errorDocument: 'error.html',
        },
        corsRules: [
          {
            allowedHeaders: ['*'],
            allowedMethods: ['GET'],
            allowedOrigins: ['*'],
            maxAgeSeconds: 3000,
          },
        ],
      },
      { provider: awsProvider, parent: this }
    );

    const deploymentId = uuidv7();
    const deployedAt = getTimestampByUUIDv7(deploymentId);

    const bundlePath = path.join(__dirname, 'prebuilt-shared');
    const packageRoot = getPackageRoot();
    const granitePath = path.join(packageRoot, '.granite');
    const prebuiltSharedPath = path.join(granitePath, 'prebuilt-shared');
    fs.mkdirSync(prebuiltSharedPath, { recursive: true });

    const files = fs.readdirSync(bundlePath);
    for (const file of files) {
      const sourcePath = path.join(bundlePath, file);
      const destPath = path.join(prebuiltSharedPath, file);
      fs.copyFileSync(sourcePath, destPath);
    }

    const bundleIos = new aws.s3.BucketObjectv2('bundle.ios.hbc.gz', {
      bucket: bucket.id,
      key: `bundles/shared/${deploymentId}/bundle.ios.hbc.gz`,
      source: new pulumi.asset.FileAsset(path.join(prebuiltSharedPath, 'bundle.ios.hbc.gz')),
      contentType: 'application/gzip',
      cacheControl: 's-maxage=31536000, max-age=0',
      contentEncoding: 'gzip',
      metadata: {
        'x-deployment-id': deploymentId,
        'x-deployment-deployed-at': toDeployedAtString(new Date(deployedAt)),
      },
    });
    const bundleAndroid = new aws.s3.BucketObjectv2('bundle.android.hbc.gz', {
      bucket: bucket.id,
      key: `bundles/shared/${deploymentId}/bundle.android.hbc.gz`,
      source: new pulumi.asset.FileAsset(path.join(prebuiltSharedPath, 'bundle.android.hbc.gz')),
      contentType: 'application/gzip',
      cacheControl: 's-maxage=31536000, max-age=0',
      contentEncoding: 'gzip',
      metadata: {
        'x-deployment-id': deploymentId,
        'x-deployment-deployed-at': toDeployedAtString(new Date(deployedAt)),
      },
    });
    const deploymentState = new aws.s3.BucketObjectv2('deployment_state', {
      bucket: bucket.id,
      key: 'deployments/shared/deployment_state',
      contentType: 'application/json',
      source: new pulumi.asset.StringAsset(
        JSON.stringify({
          type: 'STABLE',
          deploymentId,
        })
      ),
    });
    const deployments = new aws.s3.BucketObjectv2('DEPLOYMENTS', {
      bucket: bucket.id,
      key: 'deployments/shared/DEPLOYMENTS',
      contentType: 'application/json',
      source: new pulumi.asset.StringAsset(
        JSON.stringify([
          {
            deploymentId,
            deployedAt,
          },
        ])
      ),
    });

    // Cache invalidation lambda IAM role
    const cacheInvalidationRole = new aws.iam.Role(
      'cacheInvalidationRole',
      {
        name: `${resourceName}_cache_invalidation_role`,
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
          Service: 'lambda.amazonaws.com',
        }),
      },
      { provider: awsProvider, parent: this }
    );

    // Attach policy to allow CloudFront invalidation and logging
    const cacheInvalidationPolicy = new aws.iam.RolePolicy(
      'cacheInvalidationPolicy',
      {
        name: `${resourceName}_cache_invalidation_policy`,
        role: cacheInvalidationRole.id,
        policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'cloudfront:CreateInvalidation',
                's3:GetObject',
                's3:ListBucket',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              Resource: '*',
            },
          ],
        }),
      },
      { provider: awsProvider, parent: this }
    );

    // CloudFront Origin Access Identity
    const originAccessIdentity = new aws.cloudfront.OriginAccessIdentity(
      'originAccessIdentity',
      {
        comment: resourceName,
      },
      { provider: usEast1Provider, parent: this }
    );

    new aws.s3.BucketPolicy(
      'bucketPolicy',
      {
        bucket: bucket.id,
        policy: pulumi.all([bucket.arn, originAccessIdentity.iamArn]).apply(([bucketArn, oaiArn]) =>
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'AllowCloudFrontOAI',
                Effect: 'Allow',
                Principal: {
                  AWS: oaiArn,
                },
                Action: 's3:GetObject',
                Resource: `${bucketArn}/*`,
              },
              {
                Sid: 'AllowCloudFrontListBucket',
                Effect: 'Allow',
                Principal: {
                  AWS: oaiArn,
                },
                Action: 's3:ListBucket',
                Resource: bucketArn,
              },
            ],
          })
        ),
      },
      { provider: awsProvider, parent: this }
    );

    // IAM setup for Lambda@Edge
    const lambdaAtEdgeAssumeRolePolicy = aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          effect: 'Allow',
          principals: [
            {
              type: 'Service',
              identifiers: ['lambda.amazonaws.com', 'edgelambda.amazonaws.com'],
            },
          ],
          actions: ['sts:AssumeRole'],
        },
      ],
    });

    const lambdaAtEdgeRole = new aws.iam.Role(
      'lambdaAtEdgeRole',
      {
        name: `${resourceName}_lambda_role`,
        assumeRolePolicy: lambdaAtEdgeAssumeRolePolicy.json,
      },
      { provider: usEast1Provider, parent: this }
    );

    const lambdaAtEdgePolicy = aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          effect: 'Allow',
          actions: [
            'iam:CreateServiceLinkedRole',
            'lambda:GetFunction',
            'lambda:EnableReplication',
            'cloudfront:UpdateDistribution',
            's3:GetObject',
            's3:ListBucket',
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:DescribeLogStreams',
          ],
          resources: ['*'],
        },
      ],
    });

    const lambdaAtEdgeRolePolicy = new aws.iam.RolePolicy(
      'lambdaAtEdgeRolePolicy',
      {
        name: `${resourceName}_lambda_role_policy`,
        role: lambdaAtEdgeRole.id,
        policy: lambdaAtEdgePolicy.json,
      },
      { provider: usEast1Provider, parent: this }
    );

    // Helper function to create Lambda code archives
    // Simplified for this example - in real implementation,
    // you'd bundle the Lambda code with the package
    const originRequestPath = require.resolve('@granite-js/pulumi-aws/lambda/origin-request');
    const originResponsePath = require.resolve('@granite-js/pulumi-aws/lambda/origin-response');
    const autoCacheRemovalPath = require.resolve('@granite-js/pulumi-aws/lambda/auto-cache-removal');

    // Lambda@Edge functions
    const originRequestHandler = new aws.lambda.Function(
      'originRequestHandler',
      {
        publish: true,
        code: createLambdaCode(originRequestPath, {
          bucketName,
          region,
        }),
        description: 'Lambda@Edge function for serving React Native bundles from S3',
        name: `fe_edge_origin_request_${resourceName}`,
        handler: 'index.handler',
        role: lambdaAtEdgeRole.arn,
        runtime: 'nodejs22.x',
        timeout: 5,
      },
      {
        provider: usEast1Provider,
        parent: this,
        dependsOn: [lambdaAtEdgeRolePolicy],
      }
    );

    const originResponseHandler = new aws.lambda.Function(
      'originResponseHandler',
      {
        publish: true,
        code: createLambdaCode(originResponsePath, {
          bucketName,
          region,
        }),
        description: 'Lambda@Edge function for serving React Native bundles from S3',
        name: `fe_edge_origin_response_${resourceName}`,
        handler: 'index.handler',
        role: lambdaAtEdgeRole.arn,
        runtime: 'nodejs22.x',
        timeout: 5,
      },
      {
        provider: usEast1Provider,
        parent: this,
        dependsOn: [lambdaAtEdgeRolePolicy],
      }
    );

    // CloudFront Distribution
    const cloudfrontDistribution = new aws.cloudfront.Distribution(
      'cloudfrontDistribution',
      {
        comment: resourceName,
        enabled: true,
        httpVersion: 'http2and3',
        origins: [
          {
            domainName: bucket.bucketRegionalDomainName,
            originId: bucket.id,
            s3OriginConfig: {
              originAccessIdentity: originAccessIdentity.cloudfrontAccessIdentityPath,
            },
          },
        ],
        restrictions: {
          geoRestriction: {
            restrictionType: 'none',
          },
        },
        defaultCacheBehavior: {
          allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          cachedMethods: ['GET', 'HEAD'],
          compress: true,
          defaultTtl: 0,
          maxTtl: 31536000,
          minTtl: 0,
          targetOriginId: bucket.id,
          viewerProtocolPolicy: 'allow-all',
          forwardedValues: {
            queryString: true,
            headers: ['Accept-Encoding'],
            cookies: {
              forward: 'none',
            },
          },
          lambdaFunctionAssociations: [
            {
              eventType: 'origin-request',
              lambdaArn: originRequestHandler.qualifiedArn,
            },
            {
              eventType: 'origin-response',
              lambdaArn: originResponseHandler.qualifiedArn,
            },
          ],
        },
        viewerCertificate: {
          cloudfrontDefaultCertificate: true,
        },
      },
      { provider: usEast1Provider, parent: this }
    );

    // CloudFront Monitoring Subscription
    const monitoringSubscription = new aws.cloudfront.MonitoringSubscription(
      'monitoringSubscription',
      {
        distributionId: cloudfrontDistribution.id,
        monitoringSubscription: {
          realtimeMetricsSubscriptionConfig: {
            realtimeMetricsSubscriptionStatus: 'Enabled',
          },
        },
      },
      { provider: usEast1Provider, parent: this }
    );

    // Create cache invalidation Lambda
    const cacheInvalidationLambda = new aws.lambda.Function(
      'cacheInvalidationLambda',
      {
        name: `${resourceName}_cache_invalidation`,
        code: createLambdaCode(autoCacheRemovalPath, {
          bucketName,
          region,
        }),
        description: 'Lambda function that invalidates CloudFront cache based on S3 events',
        handler: 'index.handler',
        role: cacheInvalidationRole.arn,
        runtime: 'nodejs22.x',
        timeout: 30,
        environment: {
          variables: {
            // CloudFront distribution ID is needed for the lambda to know which distribution to invalidate
            // We will use a dependency to ensure this is available
            CLOUDFRONT_DISTRIBUTION_ID: pulumi.interpolate`${cloudfrontDistribution.id}`,
          },
        },
      },
      {
        provider: awsProvider,
        parent: this,
        dependsOn: [cacheInvalidationPolicy],
      }
    );

    // Add permission for S3 to invoke the Lambda function
    const lambdaPermission = new aws.lambda.Permission(
      'lambdaPermission',
      {
        action: 'lambda:InvokeFunction',
        function: cacheInvalidationLambda.name,
        principal: 's3.amazonaws.com',
        sourceArn: bucket.arn,
      },
      { provider: awsProvider, parent: this }
    );

    // Configure S3 event notification to trigger Lambda
    new aws.s3.BucketNotification(
      'bucketNotification',
      {
        bucket: bucket.id,
        lambdaFunctions: [
          {
            lambdaFunctionArn: cacheInvalidationLambda.arn,
            events: ['s3:ObjectCreated:*', 's3:ObjectRemoved:*'],
            filterPrefix: 'deployments/', // Only trigger for objects in deployments/ folder
          },
        ],
      },
      {
        provider: awsProvider,
        parent: this,
        dependsOn: [lambdaPermission, cacheInvalidationLambda],
      }
    );

    pulumi.all([bundleIos.id, bundleAndroid.id, deploymentState.id, deployments.id]).apply(() => {
      fs.rmSync(granitePath, { recursive: true, force: true });
      return null;
    });

    // Set outputs
    this.cloudfrontDistributionId = cloudfrontDistribution.id;
    this.cloudfrontOriginAccessIdentityArn = originAccessIdentity.iamArn;
    this.bucketName = bucket.bucket;
    this.bucketEndpoint = bucket.websiteEndpoint;
    this.cloudfrontDomain = cloudfrontDistribution.domainName;
    this.monitoringSubscriptionId = monitoringSubscription.id;
    this.sharedDeploymentId = pulumi.output(deploymentId);
    // Register all outputs
    this.registerOutputs({
      sharedDeploymentId: this.sharedDeploymentId,
      cloudfrontDistributionId: this.cloudfrontDistributionId,
      cloudfrontOriginAccessIdentityArn: this.cloudfrontOriginAccessIdentityArn,
      bucketName: this.bucketName,
      bucketEndpoint: this.bucketEndpoint,
      cloudfrontDomain: this.cloudfrontDomain,
      monitoringSubscriptionId: this.monitoringSubscriptionId,
    });
  }
}
