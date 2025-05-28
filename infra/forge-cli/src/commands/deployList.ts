import { Command } from '@commander-js/extra-typings';
import { S3Client } from '@granite-js/deployment-manager';
import { withS3Client } from '../helpers/command';
import { deployList as deployListOperation } from '../operations/deployList';

export function deployList() {
  return withS3Client(new Command('deploy-list'))
    .description('Show the deployment list of a Granite application')
    .requiredOption('-n, --app-name <APP_NAME>', 'Granite application name')
    .action(async (options) => {
      await deployListOperation(options, {
        s3Client: new S3Client({
          region: options.region,
          bucket: options.bucket,
          credentials: {
            accessKeyId: options.accessKeyId,
            secretAccessKey: options.secretAccessKey,
            sessionToken: options.sessionToken,
          },
        }),
      });
    });
}
