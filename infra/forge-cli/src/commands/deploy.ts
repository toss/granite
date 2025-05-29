import path from 'path';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { loadSharedConfigFiles } from '@aws-sdk/shared-ini-file-loader';
import * as p from '@clack/prompts';
import { Command } from '@commander-js/extra-typings';
import { loadConfig } from '@granite-js/cli';
import { S3Client } from '@granite-js/deployment-manager';
import * as v from 'valibot';
import { deploy as deployOperation } from '../operations/deploy';

const envSchema = v.object({
  AWS_REGION: v.string(),
  AWS_ACCESS_KEY_ID: v.string(),
  AWS_SECRET_ACCESS_KEY: v.string(),
  AWS_SESSION_TOKEN: v.optional(v.string()),
});

const awsCredentialsProvider = fromNodeProviderChain();

export function deploy() {
  return new Command('deploy')
    .description('Deploy a Granite application')
    .requiredOption('--bucket <BUCKET>', 'AWS bucket')
    .action(async (options) => {
      
      const [config, awsCredentials, region] = await Promise.all([
        loadConfig(),
        awsCredentialsProvider(),
        getRegion()
      ]);

      const envResult = v.safeParse(envSchema, {
        AWS_REGION: region,
        AWS_ACCESS_KEY_ID: awsCredentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: awsCredentials.secretAccessKey,
        AWS_SESSION_TOKEN: awsCredentials.sessionToken,
      });

      if (!envResult.success) {
        const missingVars = envResult.issues.map((issue) => {
          const path = issue.path?.[0];
          return path ? `process.env.${path.key}` : 'unknown variable';
        });

        p.log.error(`Required environment variables are not set:`);
        for (const missingVar of missingVars) {
          p.log.error(`${missingVar}`);
        }
        process.exit(1);
      }

      await deployOperation(
        {
          appName: config.appName,
          iosBundle: path.join(config.outdir, `bundle.ios.hbc`),
          androidBundle: path.join(config.outdir, `bundle.android.hbc`),
        },
        {
          s3Client: new S3Client({
            region,
            bucket: options.bucket,
            credentials: {
              accessKeyId: envResult.output.AWS_ACCESS_KEY_ID,
              secretAccessKey: envResult.output.AWS_SECRET_ACCESS_KEY,
              sessionToken: envResult.output.AWS_SESSION_TOKEN,
            },
          }),
        }
      );
    });
}


async function getRegion() {
  const { configFile } = await loadSharedConfigFiles();

  const envRegion = process.env.AWS_REGION;

  if (envRegion != null) {
    return envRegion;
  }

  const currentProfile = process.env.AWS_PROFILE;

  if (currentProfile != null) {
    const region = configFile?.[currentProfile]?.region;

    if (region != null) {
      return region;
    }
  }

  const defaultRegion = configFile.default?.region;

  return defaultRegion;
}