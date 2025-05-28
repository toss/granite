import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

/**
 * Interface defining arguments required for React Native CDN configuration
 * @interface ReactNativeCdnArgs
 */
export interface ReactNativeCdnArgs {
  /**
   * Name of the project
   * @example "granite"
   * @type {string}
   */
  projectName: string;

  /**
   * Environment to deploy to
   * @example "prod", "alpha", "beta", "dev"
   * @type {string}
   */
  environment: string;

  /**
   * AWS region to deploy to
   * @example "us-east-1", "us-east-2", "us-west-1"
   * @type {aws.Region}
   */
  awsRegion: aws.Region;
}

export class ReactNativeBundleCDN extends pulumi.ComponentResource {
  public readonly cloudfrontDistributionId: pulumi.Output<string>;
  public readonly cloudfrontOriginAccessIdentityArn: pulumi.Output<string>;
  public readonly bucketName: pulumi.Output<string>;
  public readonly bucketEndpoint: pulumi.Output<string>;
  public readonly cloudfrontDomain: pulumi.Output<string>;

  constructor(name: string, args: ReactNativeCdnArgs, opts?: pulumi.ComponentResourceOptions) {
    super('custom:aws:ReactNativeBundleCDN', name, {}, opts);

    // Extract args with defaults
    const { projectName, environment, awsRegion } = args;

    // Create resource name
    const resourceName = `${environment}_${projectName}`;

    // Log bucket name - generated internally based on project name
    const logBucketName = `${resourceName}-logs.s3.amazonaws.com`;

    // Main AWS provider
    const awsProvider = new aws.Provider(
      'awsProvider',
      {
        region: awsRegion,
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

    // CloudFront Origin Access Identity
    const originAccessIdentity = new aws.cloudfront.OriginAccessIdentity(
      'originAccessIdentity',
      {
        comment: resourceName,
      },
      { provider: usEast1Provider, parent: this }
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
    const createLambdaCode = (handlerName: string) => {
      const code = `
exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const response = event.Records[0].cf.response;
    
    // Example ${handlerName} logic
    console.log('Processing ${handlerName}');
    
    return ${handlerName === 'origin-request' ? 'request' : 'response'};
};`;

      return new pulumi.asset.AssetArchive({
        'index.js': new pulumi.asset.StringAsset(code),
      });
    };

    // Lambda@Edge functions
    const originRequestHandler = new aws.lambda.Function(
      'originRequestHandler',
      {
        publish: true,
        code: createLambdaCode('origin-request'),
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
        code: createLambdaCode('origin-response'),
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
        loggingConfig: {
          bucket: logBucketName,
          includeCookies: false,
          prefix: `${resourceName}/`,
        },
      },
      { provider: usEast1Provider, parent: this }
    );

    // Set outputs
    this.cloudfrontDistributionId = cloudfrontDistribution.id;
    this.cloudfrontOriginAccessIdentityArn = originAccessIdentity.iamArn;
    this.bucketName = bucket.bucket;
    this.bucketEndpoint = bucket.websiteEndpoint;
    this.cloudfrontDomain = cloudfrontDistribution.domainName;

    this.registerOutputs({
      cloudfrontDistributionId: this.cloudfrontDistributionId,
      cloudfrontOriginAccessIdentityArn: this.cloudfrontOriginAccessIdentityArn,
      bucketName: this.bucketName,
      bucketEndpoint: this.bucketEndpoint,
      cloudfrontDomain: this.cloudfrontDomain,
    });
  }
}
