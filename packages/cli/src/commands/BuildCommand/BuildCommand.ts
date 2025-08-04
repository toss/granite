import { BuildUtils } from '@granite-js/mpack';
import { statusPlugin } from '@granite-js/mpack/plugins';
import { loadConfig } from '@granite-js/plugin-core';
import { Command, Option } from 'clipanion';
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
      const options = (['android', 'ios'] as const).map((platform) => ({
        dev,
        cache,
        metafile,
        platform,
        outfile: `bundle.${platform}.js`,
      }));

      await BuildUtils.buildAll(options, { config, plugins: [statusPlugin] });

      return ExitCode.SUCCESS;
    } catch (error: unknown) {
      return errorHandler(error);
    }
  }
}
