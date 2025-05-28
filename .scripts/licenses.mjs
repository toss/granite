import {
  generateLicenses,
  targetWorkspaces,
  consistencyCheckLicenses,
  getWorkspaces,
  getLicensesMetaList,
} from './utils/licenses.mjs';

/**
 * 'check' | 'generate' | 'consistency-check'
 */
const command = process.argv[2];

/**
 * List of allowed licenses and their terms links
 */
const ALLOWED_LICENSE_MAP = {
  MIT: 'https://opensource.org/licenses/MIT',
  'Apache-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
  'Apache 2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
  ISC: 'https://opensource.org/licenses/ISC',
  'BSD-3-Clause': 'https://opensource.org/licenses/BSD-3-Clause',
  '(MIT AND Apache-2.0)': 'https://opensource.org/licenses/MIT, https://www.apache.org/licenses/LICENSE-2.0',
};

/**
 * Packages to check and generate licenses for
 *
 * @type {Array<string | {name: string, license?: 'GPL-3.0' | 'Apache-2.0', extendsLicense: Array<{packageName: string, licenseName: string, repository: string | null}>}>}
 */
const FOCUSED_WORKSPACES = [
  'packages/*',
  'infra/*',
  // override
  {
    name: '@granite-js/mpack',
    extendsLicense: [
      {
        packageName: 'metro',
        licenseName: 'MIT',
        repository: 'https://github.com/facebook/metro',
      },
    ],
  },
];

async function runGenerate() {
  const workspaces = await getWorkspaces();
  const targetedWorkspaces = await targetWorkspaces(workspaces, FOCUSED_WORKSPACES);

  const generateResults = await Promise.allSettled(
    targetedWorkspaces.map(({ license, extendsLicense, location, name }) =>
      generateLicenses({
        workspaceName: name,
        location,
        license,
        extendsLicense,
        allowedLicenseMap: ALLOWED_LICENSE_MAP,
      })
    )
  );

  for (const [index, result] of generateResults.entries()) {
    const { name } = targetedWorkspaces[index];
    if (result.status === 'fulfilled') {
      console.log(`✅ ${name}: NOTICE file has been generated.`);
    } else {
      console.error(`❌ ${name}: Failed to generate NOTICE file.`);
      console.error(result.reason);
    }
  }
}

async function runCheck() {
  const workspaces = await getWorkspaces();
  const targetedWorkspaces = await targetWorkspaces(workspaces, FOCUSED_WORKSPACES);

  const checkWorkspaceLicenses = async ({ name }) => {
    const workspaceLicenses = await getLicensesMetaList({ workspaceName: name });
    const internalPackages = [
      // In repository
      /^@?granite-js/,
    ];

    const disallowedLicenses = workspaceLicenses.filter(
      (license) =>
        !ALLOWED_LICENSE_MAP[license.licenseName] &&
        !internalPackages.some((regexp) => regexp.test(license.packageName))
    );

    return {
      workspaceName: name,
      isValid: disallowedLicenses.length === 0,
      licenses: disallowedLicenses,
    };
  };

  const workspaceInvalidLicenseMetaList = [];
  for (const workspace of targetedWorkspaces) {
    workspaceInvalidLicenseMetaList.push(await checkWorkspaceLicenses(workspace));
  }

  for (const result of workspaceInvalidLicenseMetaList) {
    const { workspaceName, isValid, licenses } = result;
    if (!isValid) {
      console.error(`❌ ${workspaceName}: License check failed.`);
      console.error(licenses);
      process.exit(1);
    } else {
      console.log(`✅ ${workspaceName}: License check passed.`);
    }
  }
}

async function runConsistencyCheck() {
  const workspaces = await getWorkspaces();
  const targetedWorkspaces = await targetWorkspaces(workspaces, FOCUSED_WORKSPACES);
  const consistencyCheckResults = [];
  for (const { extendsLicense, location, name, license } of targetedWorkspaces) {
    const result = await consistencyCheckLicenses({
      workspaceName: name,
      location,
      license,
      extendsLicense,
      allowedLicenseMap: ALLOWED_LICENSE_MAP,
    });
    consistencyCheckResults.push(result);
  }

  for (let i = 0; i < consistencyCheckResults.length; i++) {
    const { name } = targetedWorkspaces[i];
    const isValid = consistencyCheckResults[i];
    if (isValid) {
      console.log(`✅ ${name}: NOTICE consistency check passed.`);
    } else {
      console.error(`❌ ${name}: NOTICE consistency check failed. Please run 'yarn generate-licenses' command.`);
      process.exit(1);
    }
  }
}

switch (command) {
  case 'check':
    await runCheck();
    break;
  case 'generate':
    await runGenerate();
    break;
  case 'consistency-check':
    await runConsistencyCheck();
    break;
  default:
    console.error('Invalid Command');
    process.exit(0);
}
