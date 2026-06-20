import fs from 'fs';
import { getYarnWorkspaces } from 'workspace-tools';

const TEMPLATE_PACKAGE_JSON_GLOB = 'templates/**/package.json';

/**
 * Update template package.json files to use the current version of the workspace packages.
 * @param versionSource which version source to change dependency versions of template package.json files
 */
async function rewriteTemplateDepVersions(versionSource: 'fixed' | 'workspace' = 'fixed') {
  const packageInfos = getYarnWorkspaces(process.cwd());
  const workspacePackageNames = packageInfos.map((workspace) => workspace.name);

  const pkgVersions: Record<string, string> = {};
  packageInfos.forEach((workspace) => {
    pkgVersions[workspace.name] = versionSource === 'fixed' ? workspace.packageJson.version : 'workspace:*';
  });

  const packageJsonPaths = fs.globSync(TEMPLATE_PACKAGE_JSON_GLOB);

  for (const pkgPath of packageJsonPaths) {
    const pkg = JSON.parse(await fs.promises.readFile(pkgPath, 'utf8'));

    if (pkg.dependencies) {
      for (const name of Object.keys(pkg.dependencies)) {
        if (workspacePackageNames.includes(name)) {
          pkg.dependencies[name] = pkgVersions[name];
        }
      }
    }

    if (pkg.devDependencies) {
      for (const name of Object.keys(pkg.devDependencies)) {
        if (workspacePackageNames.includes(name)) {
          pkg.devDependencies[name] = pkgVersions[name];
        }
      }
    }

    await fs.promises.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✅ Updated ${pkgPath}`);
  }
}

await rewriteTemplateDepVersions(process.argv[2] as any);
