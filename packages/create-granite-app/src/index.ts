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

function assertValidAppName(input: string) {
  const appName = getAppName(input);
  const kebabCaseAppName = kebabCase(appName);

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
          await copyTemplate('granite-app', {
            appPath,
            appName: getAppName(appPath),
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

  const nextSteps = [`cd ${appPath}`, `${pkgInfo.packageManager} install`, `${pkgInfo.packageManager} run dev`];

  note(nextSteps.join('\n'), 'Next steps');
  outro('Done');
}

run();
