import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DeployManager, S3Client } from '@granite-js/deployment-manager';
import { deploy } from '../../../../forge-cli/src/operations/deploy';

// The HTTP scenario driver invokes the real Forge operation in a child process
// so its normal process.exit error handling remains intact.
async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const directory = await mkdtemp(join(tmpdir(), 'forge-http-'));
  const iosBundle = join(directory, 'bundle.ios.hbc');
  const androidBundle = join(directory, 'bundle.android.hbc');
  try {
    await writeFile(iosBundle, input.contents + ':ios');
    await writeFile(androidBundle, input.contents + ':android');
    const context = {
      s3Client: new S3Client({ bucket: 'sample-bucket', region: 'us-east-1' }),
      channel: input.channel,
    };
    await deploy({ appName: input.appName, tag: input.tag, iosBundle, androidBundle }, context);
    const state = await DeployManager.readDeploymentState(input.appName, context);
    await writeFile(input.resultFile, JSON.stringify(state));
    context.s3Client.destroy();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
