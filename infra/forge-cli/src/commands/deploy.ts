import path from 'path';
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

export function deploy() {
  return new Command('deploy')
    .description('Deploy a Granite application')
    .requiredOption('--bucket <BUCKET>', 'AWS bucket')
    .action(async (options) => {
      const config = await loadConfig();

      const envResult = v.safeParse(envSchema, {
        AWS_REGION: process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
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
            region: envResult.output.AWS_REGION,
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
