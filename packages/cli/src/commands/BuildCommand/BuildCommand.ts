import { loadConfig, type BundlerBuildOption, type BuildPlatform } from '@granite-js/config';
import { Command, Option } from 'clipanion';
import { Semaphore } from 'es-toolkit';
import { ExitCode } from '../../constants';
import { errorHandler } from '../../utils/command';
import { printLogo } from '../../utils/printLogo';

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

  resetCache = Option.Boolean('--reset-cache', false, {
    description: 'Clear the bundler cache before building',
  });

  async execute() {
    printLogo();

    try {
      const { configFile, dev = false } = this;
      const config = await loadConfig({ configFile });
      if (this.resetCache) {
        await config.bundler.resetCache();
        console.log('The transform cache was reset');
      }

      const buildOptions = (['android', 'ios'] satisfies BuildPlatform[]).map(
        (platform): BundlerBuildOption => ({ platform, dev })
      );
      const semaphore = new Semaphore(buildOptions.length);
      const results = await Promise.allSettled(
        buildOptions.map(async (buildOption) => {
          await semaphore.acquire();
          try {
            return await config.bundler.runBuild(buildOption);
          } catch (error) {
            throw new Error(`Failed to build for ${buildOption.platform}`, { cause: error });
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
