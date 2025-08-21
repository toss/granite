import fs from 'fs';
import path from 'path';
import { createProjectGraphAsync, type ProjectGraph } from '@nx/devkit';
import { isNotNil } from 'es-toolkit';
import { $ } from 'zx';
import { ensureExecuteCommand } from './utils';

interface ProjectState {
  projectGraph: ProjectGraph;
  workspaceRoot: string;
}

let cachedState: ProjectState | null = null;

async function loadProject() {
  if (cachedState == null) {
    cachedState = { projectGraph: await createProjectGraphAsync(), workspaceRoot: getProjectRootImpl() };
  }

  return cachedState;
}

function getProjectRootImpl() {
  let currentPath = process.cwd();
  let latestPackageJsonPath: string | null = null;
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    if (fs.existsSync(path.join(currentPath, 'package.json'))) {
      latestPackageJsonPath = currentPath;
    }

    currentPath = path.dirname(currentPath);
  }

  if (latestPackageJsonPath == null) {
    throw new Error('Cannot find project root');
  }

  return latestPackageJsonPath;
}

async function projectRoot() {
  const { workspaceRoot } = await loadProject();
  return workspaceRoot;
}

async function dependenciesOf(packageName: string) {
  const { projectGraph, workspaceRoot } = await loadProject();
  const visited = new Set<string>();
  const result = new Set<string>();
  const pathMap: Record<string, string> = {};

  const traverse = (packageName: string) => {
    if (visited.has(packageName)) {
      return;
    }

    visited.add(packageName);

    const dependencies = projectGraph.dependencies[packageName] ?? [];

    for (const dependency of dependencies) {
      const targetNode = projectGraph.nodes[dependency.target];
      const targetPath = targetNode?.data.root;

      if (dependency.target.startsWith('npm:') || targetPath == null) {
        continue;
      }

      pathMap[dependency.target] = path.join(workspaceRoot, targetPath);
      result.add(dependency.target);
      traverse(dependency.target);
    }
  };

  traverse(packageName);

  return Array.from(result).map((name) => ({ name, path: pathMap[name]! }));
}

async function locationOf(packageName: string) {
  const { projectGraph, workspaceRoot } = await loadProject();
  const targetNode = projectGraph.nodes[packageName];

  if (targetNode == null) {
    throw new Error(`Package '${packageName}' not found`);
  }

  return path.join(workspaceRoot, targetNode.data.root);
}

async function build(packages: string[]) {
  const globPattern = utils.toGlobPattern(packages);
  const $$ = $({ stdio: 'inherit' });
  const task = $$`yarn workspaces foreach -A --topological-dev --include ${globPattern} build`;

  await ensureExecuteCommand(task);
}

async function pack(packages: string[], outFile = 'package.tgz') {
  const globPattern = utils.toGlobPattern(packages);
  const $$ = $({ stdio: 'inherit' });
  const task = $$`yarn workspaces foreach -A --topological-dev --include ${globPattern} pack --out ${outFile}`;

  await ensureExecuteCommand(task);

  return Promise.all(packages.map(async (name) => ({ file: path.resolve(await locationOf(name), outFile), name })));
}

async function packAndLinkWorkspacePackages(targetPackage: string, additionalPackages?: string[]) {
  const packedFile = 'package.tgz';
  const dependencies = await dependenciesOf(targetPackage);
  const combinedDependencies = [
    ...(await Promise.all(
      [targetPackage, ...(additionalPackages ?? [])].map(async (name) => ({
        name,
        path: await locationOf(name),
      }))
    )),
    ...dependencies,
  ];

  if (dependencies.length === 0) {
    console.log('👉 Dependencies not found');
  } else {
    console.log(`👉 ${dependencies.length} dependencies found`);
    console.log(dependencies.map(({ name }) => name).join('\n'));
    console.log();

    await Promise.all(
      combinedDependencies.map(async ({ name: currentName, path: packageRoot }) => {
        const packageJsonPath = path.join(packageRoot, 'package.json');
        const rawPackageJson = await fs.promises.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(rawPackageJson);
        let edited = false;

        for (const { name, path: packageRoot } of combinedDependencies) {
          // Avoid self reference
          if (currentName === name) {
            continue;
          }

          const packedFilePath = path.join(packageRoot, packedFile);

          if (typeof packageJson.dependencies !== 'undefined' && name in packageJson.dependencies) {
            packageJson.dependencies[name] = packedFilePath;
            edited = true;
          }

          if (typeof packageJson.devDependencies !== 'undefined' && name in packageJson.devDependencies) {
            packageJson.devDependencies[name] = packedFilePath;
            edited = true;
          }
        }

        if (edited) {
          await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
          console.log(`✅ ${packageJsonPath} updated`);
        }
      })
    );
  }

  const dependencyNames = combinedDependencies.map(({ name }) => name);

  console.log('👉 Start packing...');
  console.log(dependencyNames.join('\n'));
  console.log();

  const packResults = await pack(dependencyNames, packedFile);

  console.log(`✅ Packed successfully`);

  return packResults;
}

async function getPackages({ ignorePrivate = false }: { ignorePrivate?: boolean } = {}) {
  const { projectGraph } = await loadProject();
  const packages = Object.keys(projectGraph.nodes);

  return packages
    .map((name) => {
      const targetPackage = projectGraph.nodes[name];

      if (targetPackage == null) {
        return;
      }

      if (ignorePrivate) {
        const isPrivate = targetPackage?.data?.tags?.includes('npm:private');

        if (isPrivate) {
          return;
        }
      }

      return targetPackage;
    })
    .filter(isNotNil);
}

const utils = {
  toGlobPattern: (packages: string[]) => (packages.length === 1 ? packages[0] : `{${packages.join(',')}}`),
};

export const Project = {
  projectRoot,
  locationOf,
  dependenciesOf,
  build,
  pack,
  packAndLinkWorkspacePackages,
  getPackages,
};
