import { loadConfig, type BundlerBuildOption, type BuildPlatform } from '@granite-js/config';
import { Command, Option } from 'clipanion';
import { Semaphore } from 'es-toolkit';
import { ExitCode } from '../../constants';
import { errorHandler } from '../../utils/command';

export class BuildCommand extends Command {
  static paths = [[`build`]];

  static usage = Command.Usage({
    category: 'Build',
    description: 'Build Granite App',
    examples: [['Build Granite App', 'granite build']],
  });

  configFile = Option.String('--config', {
    description: 'Path to config file',
  });

  dev = Option.Boolean('--dev', {
    description: 'Build in development mode',
  });

  metafile = Option.Boolean('--metafile', {
    description: 'Generate metafile',
  });

  cache = Option.Boolean('--cache', {
    description: 'Enable cache',
  });

  async execute() {
    try {
      const { configFile, cache = true, metafile = false, dev = false } = this;
      const config = await loadConfig({ configFile });

      const buildOptions = (['android', 'ios'] satisfies BuildPlatform[]).map(
        (platform): BundlerBuildOption => ({ platform, cache, metafile, dev })
      );
      const semaphore = new Semaphore(buildOptions.length);
      const results = await Promise.allSettled(
        buildOptions.map(async (buildOption) => {
          await semaphore.acquire();
          try {
            return await config.bundler.runBuild(buildOption);
          } finally {
            semaphore.release();
          }
        })
      );
      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          'Granite build failed'
        );
      }

      return ExitCode.SUCCESS;
    } catch (error: unknown) {
      return errorHandler(error);
    }
  }
}
