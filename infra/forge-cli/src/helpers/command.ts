import { Command } from '@commander-js/extra-typings';

export function withS3Client<C extends Command>(command: C) {
  return command
    .requiredOption('--region <REGION>', 'AWS region')
    .requiredOption('--bucket <BUCKET>', 'AWS bucket')
    .requiredOption('--access-key-id <ACCESS_KEY_ID>', 'AWS access key ID')
    .requiredOption('--secret-access-key <SECRET_ACCESS_KEY>', 'AWS secret access key')
    .option('--session-token <SESSION_TOKEN>', 'AWS session token');
}
