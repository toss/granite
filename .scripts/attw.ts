import { Project } from './utils/project';
import pc from 'picocolors';
import { $ } from 'zx';

const IGNORE_RULES = ['internal-resolution-error', 'false-export-default'];
const IGNORE_PACKAGE_PATHS = ['packages/create-granite-app', 'infra/forge-cli'];

function parseArgs(argv: string[]) {
  return { bail: argv.includes('--bail') };
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

async function run() {
  const options = parseArgs(process.argv.slice(2));
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
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
