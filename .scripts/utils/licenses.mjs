import fs from 'fs/promises';
import path from 'path';
import * as licenseTemplates from './license-templates.mjs';
import { execa } from 'execa';

export function $(file, args, options) {
  return execa(file, args, {
    cwd: process.cwd(),
    ...options,
  });
}

/**
 * 워크스페이스 목록을 가져옵니다.
 * @returns {Array<{location: string, name: string}>} 워크스페이스 정보 배열
 */
export async function getWorkspaces() {
  const { stdout } = await $('yarn', ['workspaces', 'list', '--json']);
  return stdout.split('\n').map((line) => {
    return JSON.parse(line);
  });
}

/**
 * @param {Array<{workspace: string, location: string, extendsLicense: Array<{packageName: string, licenseName: string, repository: string | null}>}>} workspaces
 * @param {Array<string | {name: string, extendsLicense: Array<{packageName: string, licenseName: string, repository: string | null}>}>} focusedWorkspaces
 *
 * @returns {Array<{name: string, location: string, extendsLicense: Array<{packageName: string, licenseName: string, repository: string | null}>}>}
 */
export async function targetWorkspaces(workspaces, focusedWorkspaces) {
  const isFocusedWorkspace = (workspace, focused) => {
    if (typeof focused === 'string') {
      // packages/* 같은 패턴인 경우
      if (focused.includes('*')) {
        const pattern = focused.replace('*', '[^/]*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(workspace.location);
      }
      return focused === workspace.name;
    }
    return focused.name === workspace.name;
  };

  const focusWorkspace = (workspace) => focusedWorkspaces.findLast((focused) => isFocusedWorkspace(workspace, focused));

  const targetedWorkspaces = workspaces
    .map((workspace) => {
      const focusedWorkspace = focusWorkspace(workspace);
      return focusedWorkspace
        ? {
            ...workspace,
            license: focusedWorkspace?.license,
            extendsLicense: typeof focusedWorkspace === 'string' ? [] : (focusedWorkspace?.extendsLicense ?? []),
          }
        : null;
    })
    .filter(Boolean);

  return targetedWorkspaces;
}

export function formatLicenses(packages, extendsLicense, allowedLicenseMap) {
  return [...packages, ...extendsLicense]
    .filter((pkg) => pkg.licenseName !== 'UNKNOWN' || Object.keys(allowedLicenseMap).includes(pkg.licenseName))
    .map((pkg, index) =>
      [
        `${index + 1}. **${pkg.packageName}**`,
        '\t',
        `   - License: ${pkg.licenseName}`,
        allowedLicenseMap[pkg.licenseName] && `   - License Text: ${allowedLicenseMap[pkg.licenseName]}`,
        pkg.repository && `   - Repository: ${pkg.repository}`,
        '\t',
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n');
}

async function transformNoticeTemplate({ workspaceName, license, extendsLicense, allowedLicenseMap }) {
  const { stdout } = await $('yarn', ['licenses', 'list', '--json', '--focus', workspaceName]);
  const year = new Date().getFullYear();

  const template = (() => {
    switch (license) {
      case 'GPL-3.0':
        return licenseTemplates.gpl3;

      case 'Apache-2.0':
      default:
        return licenseTemplates.apache2;
    }
  })();

  return template(workspaceName, year, formatLicenses(parseLicenses(stdout), extendsLicense, allowedLicenseMap));
}

export async function generateLicenses({ workspaceName, location, license, extendsLicense, allowedLicenseMap }) {
  const template = await transformNoticeTemplate({ workspaceName, license, extendsLicense, allowedLicenseMap });
  await fs.writeFile(path.join(location, 'NOTICE'), template);
}

export async function consistencyCheckLicenses({
  workspaceName,
  location,
  license,
  extendsLicense,
  allowedLicenseMap,
}) {
  const template = await transformNoticeTemplate({ workspaceName, license, extendsLicense, allowedLicenseMap });
  const currentTemplate = await fs.readFile(path.join(location, 'NOTICE'), 'utf-8');

  return template === currentTemplate;
}

export async function getLicensesMetaList({ workspaceName }) {
  const { stdout } = await $('yarn', ['licenses', 'list', '--json', '--focus', workspaceName]);

  const parsedLicenses = parseLicenses(stdout);
  return parsedLicenses;
}

/**
 * Parses the output of `yarn licenses list` and returns an array of packages with their licenses and repositories.
 *
 * @param {string} input - The output of `yarn licenses list`.
 * @returns {Array<{packageName: string, licenseName: string, repository: string | null}>} An array of packages with their licenses and repositories.
 */

export function parseLicenses(stdout) {
  // Split the stdout by newlines and filter out empty lines
  const lines = stdout.trim().split('\n').filter(Boolean);

  const results = [];

  // Each line should be a JSON object with a structure similar to:
  // {
  //   "value": "MIT",
  //   "children": {
  //     "packageName@version": {
  //       "value": { "locator": "packageName@npm:version", "descriptor": "packageName@..." },
  //       "children": {
  //         "url": "https://github.com/...",
  //         "vendorUrl": "https://...",
  //         "vendorName": "...",
  //       }
  //     },
  //     ...
  //   }
  // }

  for (const line of lines) {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      // If a line can't be parsed as JSON, skip it.
      continue;
    }

    const licenseName = parsed.value || 'UNKNOWN';
    const packages = parsed.children || {};

    for (const [fullName, pkgData] of Object.entries(packages)) {
      const value = pkgData.value || {};
      const children = pkgData.children || {};

      // Extract package name:
      // The locator might look like "es-toolkit@npm:1.26.1::__archiveUrl=http..."
      // or "@granite-js/cli@workspace:packages/cli"
      // We'll try multiple strategies:
      let packageName = null;
      if (value.descriptor) {
        // descriptor often looks like "es-toolkit@npm:^1.26.1" or "@granite-js/cli@workspace:*"
        // We'll split at '@npm:' or '@workspace:' to isolate the package name.
        const descriptor = value.descriptor;
        packageName = descriptor.split('@npm:')[0].split('@workspace:')[0];
        // In some cases, packageName might still contain version/range, handle that:
        // If descriptor is something like "es-toolkit@npm:^1.26.1", packageName might be "es-toolkit"
        // If descriptor is something like "@granite-js/cli@workspace:*", packageName might be "@granite-js/cli"
        if (packageName.includes('@')) {
          // For scoped packages, descriptor might be "@scope/name@workspace:..."
          // Split by '@' but keep scope if it starts with '@'
          const parts = descriptor.split('@');
          if (descriptor.startsWith('@') && parts.length > 2) {
            // E.g. "@granite-js/cli@workspace:*"
            // After splitting by '@' -> ['', 'granite-js/cli', 'workspace:*']
            // Reconstruct: '@granite-js/cli'
            packageName = '@' + parts[1];
          } else {
            // Non-scoped or other patterns
            packageName = parts[0];
          }
        } else {
          // If no '@' beyond the first, packageName might already be correct.
          // Just ensure we strip away possible version range after a `@npm:` or `@workspace:` key.
          // For safety, we can look at something like "es-toolkit@npm:^1.26.1"
          // Actually, we already split at '@npm:' above, so packageName should be "es-toolkit".
        }
        packageName = packageName.trim();
      } else if (value.locator) {
        // fallback if descriptor not available
        const locator = value.locator;
        packageName = locator.split('@npm:')[0].split('@workspace:')[0].trim();
        if (packageName.startsWith('@')) {
          // It's a scoped package, so it might need similar handling
          const parts = locator.split('@');
          if (locator.startsWith('@') && parts.length > 2) {
            packageName = '@' + parts[1];
          } else {
            packageName = parts[0];
          }
        }
      } else {
        // If neither descriptor nor locator is found (unlikely), fallback to fullName
        // fullName might look like "es-toolkit@npm:1.26.1..."
        // We'll strip off the version and source info
        packageName = fullName.split('@npm:')[0].split('@workspace:')[0].trim();
        if (!packageName) {
          packageName = fullName; // as a last resort
        }
      }

      // Extract repository URL:
      // The children object might have `url`, `vendorUrl`, or similar fields.
      // We'll try `url` first, then `vendorUrl`.
      let repository = children.url || children.vendorUrl || null;
      if (repository && repository.startsWith('git+')) {
        // normalize repository if needed
        // repository might be 'git+https://github.com/...'
        // It's usually fine as is, but if you want to remove 'git+' prefix:
        // repository = repository.replace(/^git\+/, '');
      }

      results.push({
        packageName,
        licenseName,
        repository,
      });
    }
  }

  return results;
}
