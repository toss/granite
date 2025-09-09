import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { $ } from 'zx';
import { Project } from '../project';

const IGNORE_RULES = ['internal-resolution-error', 'false-export-default'];
const IGNORE_PACKAGE_PATHS = [
  /**
   * Not a library, just a tool
   */
  'packages/create-granite-app',
  'infra/forge-cli',
];

export function attw() {
  return new Command('attw')
    .description('Check package.json with `Are The Types Wrong`')
    .option('--bail', 'Exit with non-zero code if any package fails', false)
    .action(async (options) => {
      const allPackages = await Project.getPackages({ ignorePrivate: true });
      const packageRoots = allPackages
        .map((packageInfo) => packageInfo.data.root)
        .filter((path) => !IGNORE_PACKAGE_PATHS.includes(path));
      const totalCount = packageRoots.length;

      console.log(`👉 Target packages (Total: ${totalCount})\n`);
      for (const packageRoot of packageRoots) {
        console.log(`- ${packageRoot}`);
      }
      console.log();

      const passed: string[] = [];
      const errors: { packageRoot: string; errorMessage: string }[] = [];
      for (let i = 0; i < totalCount; i++) {
        const packageRoot = packageRoots[i]!;
        console.log(`Running attw for`, pc.cyan(packageRoot), `(${i + 1} of ${totalCount})`);

        const errorMessage = await runAttw(packageRoot, options);

        if (errorMessage != null) {
          errors.push({ packageRoot, errorMessage });
        } else {
          passed.push(packageRoot);
        }
      }

      if (passed.length > 0) {
        console.log();
        console.log(pc.green('✅ Command passed for the following packages:'));
        for (const packageRoot of passed) {
          console.log(`- ${packageRoot}`);
        }
      }

      if (errors.length > 0) {
        console.log();
        console.log(pc.red('❌ Command failed for the following packages:'));
        for (const error of errors) {
          console.log(`- ${error.packageRoot}`);
        }
        process.exit(1);
      }
    });
}

async function runAttw(packagePath: string, options: { bail: boolean }) {
  const { exitCode, stderr, stdout } = await $({
    nothrow: true,
    stdio: 'inherit',
  })`yarn attw ${packagePath} --pack --profile strict --ignore-rules ${IGNORE_RULES}`;

  const errorMessage = stderr || stdout;
  const isError = exitCode !== 0;

  if (options.bail && isError) {
    console.error(errorMessage);
    process.exit(exitCode);
  }

  if (isError) {
    return errorMessage;
  }

  return;
}
