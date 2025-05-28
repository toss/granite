import fs from 'fs';
import path from 'path';
import { getYarnWorkspaces } from 'workspace-tools';

/**
 * @param {string[]} target
 * @param {'workspace:*' | 'auto'} updateVersion
 */
export async function updateWorkspaceProtocol(target, updateVersion = 'auto') {
  const workspaces = await getYarnWorkspaces(process.cwd());

  const workspaceVersionMap = new Map();
  const workspaceNames = workspaces.map((workspace) => {
    workspaceVersionMap.set(workspace.name, workspace.packageJson.version);
    return workspace.name;
  });

  const templateDirs = target.reduce((acc, pattern) => {
    return [...acc, ...fs.globSync(pattern)];
  }, []);

  for (const dir of templateDirs) {
    const pkgPath = path.join(dir, 'package.json');

    const pkgContent = await fs.promises.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgContent);

    if (pkg.dependencies) {
      for (const name of Object.keys(pkg.dependencies)) {
        if (workspaceNames.includes(name)) {
          pkg.dependencies[name] = updateVersion === 'auto' ? workspaceVersionMap.get(name) : updateVersion;
        }
      }
    }

    if (pkg.devDependencies) {
      for (const name of Object.keys(pkg.devDependencies)) {
        if (workspaceNames.includes(name)) {
          pkg.devDependencies[name] = updateVersion === 'auto' ? workspaceVersionMap.get(name) : updateVersion;
        }
      }
    }

    await fs.promises.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✅ Updated ${pkgPath}`);
  }
}
