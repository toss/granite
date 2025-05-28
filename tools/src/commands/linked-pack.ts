import { Command } from '@commander-js/extra-typings';
import { Project } from '../project';

export function linkedPack() {
  return new Command('linked-pack')
    .description('Pack the given package and its dependencies and replace workspace protocol with file protocol')
    .argument('<string>', 'Target package to pack')
    .option('-p, --packages [PACKAGES]', 'Additional packages to pack (comma separated)')
    .action(async (packageName, options) => {
      await Project.packAndLinkWorkspacePackages(
        packageName,
        typeof options.packages === 'string' ? options.packages.split(',') : undefined
      );

      process.exit(0);
    });
}
