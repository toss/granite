import { Project } from './utils/project';

function parseArgs(argv: string[]) {
  const [targetPackage, ...rest] = argv;

  if (targetPackage == null) {
    throw new Error('Usage: tsx .scripts/linked-pack.ts <target-package> [--packages <package...>]');
  }

  const packagesFlagIndex = rest.indexOf('--packages');
  if (packagesFlagIndex === -1) {
    return { targetPackage, additionalPackages: undefined };
  }

  return {
    targetPackage,
    additionalPackages: rest.slice(packagesFlagIndex + 1),
  };
}

async function run() {
  const { targetPackage, additionalPackages } = parseArgs(process.argv.slice(2));

  await Project.packAndLinkWorkspacePackages(targetPackage, additionalPackages);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
