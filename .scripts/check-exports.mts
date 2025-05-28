import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { relative, join } from 'node:path';
import { $ } from 'execa';

interface PackageInfo {
  name: string;
  location: string;
}

interface ExportEntry {
  import?: string;
  require?: string;
  types?: string;
  default?: string;
}

interface ExportEntryByType {
  import: {
    default?: string;
    types?: string;
  };
  require: {
    default?: string;
    types?: string;
  };
}

interface PackageJson {
  name: string;
  main?: string;
  module?: string;
  types?: string;
  bin?: string | Record<string, string>;
  exports?: Record<string, string | ExportEntry | ExportEntryByType>;
}

interface PackedFile {
  location: string;
}

const EXCLUDED_PACKAGE_PATTERNS = [/@granite-js\/docs/];

async function getPackageList() {
  const { stdout, stderr, exitCode } = await $`yarn workspaces list --json`;

  if (exitCode !== 0) {
    throw new Error([stdout, stderr].filter(Boolean).join('\n'));
  }

  return (
    normalizeStdout(stdout)
      .map((line) => JSON.parse(line.trim()))
      // avoid workspace root
      .filter(({ location }) => location !== '.') as PackageInfo[]
  );
}

async function readPackageJson(packagePath: string) {
  return JSON.parse(await readFile(join(packagePath, 'package.json'), 'utf-8')) as PackageJson;
}

async function getPackedFiles(packageName: string) {
  const { stdout, stderr, exitCode } = await $`yarn workspace ${packageName} pack --dry-run --json`;

  if (exitCode !== 0) {
    throw new Error([stdout, stderr].filter(Boolean).join('\n'));
  }

  return normalizeStdout(stdout)
    .map((line) => JSON.parse(line.trim()))
    .filter((data: PackedFile | { base: string }) => 'location' in data)
    .map(({ location }) => ({ location: relative(process.cwd(), location) })) as PackedFile[];
}

function normalizeStdout(stdout) {
  return stdout.split('\n').map((text) => text.trim());
}

function comparePath(path1: string, path2: string) {
  const base = process.cwd();
  return relative(base, path1) === relative(base, path2);
}

function shouldVerify(packageJson: PackageJson) {
  if (EXCLUDED_PACKAGE_PATTERNS.some((pattern) => packageJson.name.match(pattern))) {
    return false;
  }

  return (
    Boolean(Object.keys(packageJson.bin ?? {}).length) ||
    Boolean(Object.keys(packageJson.exports ?? {}).length) ||
    Boolean(packageJson.main) ||
    Boolean(packageJson.module) ||
    Boolean(packageJson.types)
  );
}
async function prebuildPackages(packageJsonList: PackageJson[]) {
  console.log(`Pre-building ${packageJsonList.length} packages (with its dependencies)...`);
  const includePackages = packageJsonList.map(({ name }) => name).join(',');

  const { stdout, stderr, exitCode } = await $(
    'yarn',
    ['nx', 'run-many', '--target=build', `--projects=${includePackages}`],
    {
      stdio: 'inherit',
    }
  );

  if (exitCode !== 0) {
    throw new Error([stdout, stderr].filter(Boolean).join('\n'));
  }
}

async function verifyPackageExports(packageJson: PackageJson) {
  console.log(`Verifying '${packageJson.name}'...`);
  const files = await getPackedFiles(packageJson.name);

  if (typeof packageJson.main !== 'undefined') {
    assert(
      files.some(({ location }) => comparePath(location, packageJson.main!)),
      `'main' field is not in the packed files: ${packageJson.main}`
    );
    console.log(`  ✅ pkg.main`);
  }

  if (typeof packageJson.module !== 'undefined') {
    assert(
      files.some(({ location }) => comparePath(location, packageJson.module!)),
      `'module' field is not in the packed files: ${packageJson.module}`
    );
    console.log(`  ✅ pkg.module`);
  }

  if (typeof packageJson.bin !== 'undefined') {
    if (typeof packageJson.bin === 'string') {
      assert(
        files.some(({ location }) => comparePath(location, packageJson.bin as string)),
        `bin field is not in the packed files: ${packageJson.bin}`
      );
      console.log(`  ✅ pkg.bin`);
    } else {
      for (const [key, value] of Object.entries(packageJson.bin)) {
        assert(
          files.some(({ location }) => comparePath(location, value)),
          `bin['${key}'] field is not in the packed files: ${value}`
        );
        console.log(`  ✅ pkg.bin['${key}']`);
      }
    }
  }

  if (typeof packageJson.exports !== 'undefined') {
    for (const [key, entry] of Object.entries(packageJson.exports)) {
      if (typeof entry === 'string') {
        assert(
          files.some(({ location }) => comparePath(location, entry)),
          `exports['${key}'] field is not in the packed files: ${entry}`
        );
        console.log(`  ✅ pkg.exports['${key}']`);
      } else if (typeof entry.import === 'object' && typeof entry.require === 'object') {
        for (const [type, value] of Object.entries((entry as ExportEntryByType).import)) {
          assert(
            files.some(({ location }) => comparePath(location, value)),
            `exports['${key}'].import.${type} field is not in the packed files: ${value}`
          );
          console.log(`  ✅ pkg.exports['${key}'].import.${type}`);
        }

        for (const [type, value] of Object.entries((entry as ExportEntryByType).require)) {
          assert(
            files.some(({ location }) => comparePath(location, value)),
            `exports['${key}'].require.${type} field is not in the packed files: ${value}`
          );
          console.log(`  ✅ pkg.exports['${key}'].require.${type}`);
        }
      } else if (['require', 'import', 'types', 'default'].some((key) => key in entry)) {
        for (const [type, value] of Object.entries(entry as ExportEntry)) {
          assert(
            files.some(({ location }) => comparePath(location, value)),
            `exports['${key}'].${type} field is not in the packed files: ${value}`
          );
          console.log(`  ✅ pkg.exports['${key}'].${type}`);
        }
      } else {
        throw new Error(`invalid exports field: ${JSON.stringify(entry)}`);
      }
    }
  }

  console.log(); // nl
}

async function runCheckExports() {
  const packages = await getPackageList();
  const packageJsonList = await Promise.all(packages.map(({ location }) => readPackageJson(location)));

  try {
    const targetPackageJsonList = packageJsonList.filter(shouldVerify);
    await prebuildPackages(targetPackageJsonList);

    for (const packageJson of targetPackageJsonList) {
      await verifyPackageExports(packageJson);
    }

    console.log('✅ No invalid package found');
    process.exit(0);
  } catch (error) {
    console.error('❗️ Invalid package found');
    console.error(error);
    process.exit(1);
  }
}

const MAIN_BRANCH = 'origin/main';

async function packageJsonChanged() {
  const { stdout } = await $`git diff ${MAIN_BRANCH} --name-only`;
  return stdout.includes('package.json');
}

async function main() {
  try {
    const changed = await packageJsonChanged();

    if (changed) {
      await runCheckExports();
    } else {
      console.log('✅ No package.json changes found');
      process.exit(0);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
