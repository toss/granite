import { isCancel, intro, text, tasks, cancel, note, outro, multiselect } from '@clack/prompts';
import { kebabCase } from 'es-toolkit/string';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { copyTemplate } from './copyTemplate';
import { copyToolTemplate, TOOL_TEMPLATE_LIST } from './copyToolTemplate';
import { getPackageManager } from './getPackageManager';
import { resolveFallback } from './resolveFallback';

function getAppName(appPath: string) {
  return appPath.split('/').pop() || '';
}

function getNativeAppName(appName: string) {
  return appName
    .split(/[-_.]/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join('');
}

function getDefaultNativeId(appName: string) {
  return `run.granite.${appName.replaceAll('-', '')}`;
}

function assertValidNativeId(input: string, optionName: string) {
  if (!input.match(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/)) {
    throw new Error(`${optionName} must be a valid reverse-DNS identifier (e.g. run.granite.myapp)`);
  }
}

function assertValidAppName(input: string) {
  const appName = getAppName(input);
  const kebabCaseAppName = kebabCase(appName);

  if (appName === '') {
    return;
  }

  if (kebabCaseAppName !== appName) {
    throw new Error(`Project name must be in kebab-case (e.g. ${kebabCaseAppName})`);
  }

  if (!appName.match(/^(?:(?:@(?:[a-z0-9-*~][a-z0-9-*._~]*)?\/[a-z0-9-._~])|[a-z0-9-~])[a-z0-9-._~]*$/)) {
    throw new Error('Invalid project name. Only lowercase letters, numbers, and hyphens (-) are allowed.');
  }
}

async function run() {
  const pkgInfo = getPackageManager();

  const cli = await yargs(hideBin(process.argv))
    .options({
      tools: {
        type: 'array',
        description: 'Select development tools to include in the project',
        default: [],
        choices: TOOL_TEMPLATE_LIST,
      },
      greenfield: {
        type: 'boolean',
        description: 'Create a React Native bare-style Granite app with iOS and Android projects',
        default: false,
      },
      'bundle-id': {
        type: 'string',
        description: 'Override the iOS bundle identifier for --greenfield apps',
      },
      'android-package': {
        type: 'string',
        description: 'Override the Android application id/package for --greenfield apps',
      },
    })
    .help().argv;

  intro('Create Granite App Project');

  const argProjectPath = typeof cli._[0] === 'string' ? cli._[0] : null;

  const appPath = await resolveFallback(argProjectPath, () =>
    text({
      message: 'Project name or path:',
      placeholder: 'my-granite-app',
      defaultValue: 'my-granite-app',
      validate: (value: string) => {
        try {
          assertValidAppName(value);
          return;
        } catch (e) {
          if (e instanceof Error) {
            return e.message;
          }
          return 'Invalid project name';
        }
      },
    })
  );

  if (isCancel(appPath)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  assertValidAppName(appPath);
  const appName = getAppName(appPath);
  const bundleId = cli.bundleId ?? getDefaultNativeId(appName);
  const androidPackage = cli.androidPackage ?? getDefaultNativeId(appName);

  if (cli.greenfield) {
    assertValidNativeId(bundleId, '--bundle-id');
    assertValidNativeId(androidPackage, '--android-package');
  }

  const toolTemplate = await resolveFallback(cli.tools.length > 0 ? cli.tools : null, async () =>
    multiselect({
      message: 'Select tools',
      options: [
        { value: 'eslint-prettier', label: 'ESLint + Prettier' },
        { value: 'biome', label: 'Biome' },
      ],
      required: true,
    })
  );

  if (isCancel(toolTemplate)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  await tasks([
    {
      title: `Creating Granite App`,
      task: async () => {
        try {
          await copyTemplate(cli.greenfield ? 'greenfield-app' : 'granite-app', {
            appPath,
            appName,
            bundleId,
            androidPackage,
            androidPackagePath: androidPackage.replaceAll('.', '/'),
            nativeAppName: getNativeAppName(appName),
            needYarnrc: Boolean(pkgInfo.packageManager === 'yarn' && pkgInfo.version && pkgInfo?.version >= '2.0.0'),
          });
          await Promise.all(toolTemplate.map((tool) => copyToolTemplate(tool, { appPath })));
        } catch (e) {
          console.error(e);
          throw e;
        }
        return `Created Granite App`;
      },
    },
  ]);

  const nextSteps = cli.greenfield
    ? [
        `cd ${appPath}`,
        `${pkgInfo.packageManager} install`,
        `cd ios && pod install && cd ..`,
        `${pkgInfo.packageManager} run dev`,
        'Open ios/*.xcworkspace in Xcode or android/ in Android Studio',
      ]
    : [`cd ${appPath}`, `${pkgInfo.packageManager} install`, `${pkgInfo.packageManager} run dev`];

  note(nextSteps.join('\n'), 'Next steps');
  outro('Done');
}

run();
