import { BuildUtils } from '@granite-js/mpack';
import { statusPlugin } from '@granite-js/mpack/plugins';
import { Command, Option } from 'clipanion';
import { loadConfig } from '../../config/loadConfig';

export class BuildCommand extends Command {
  static paths = [[`build`]];

  static usage = Command.Usage({
    category: 'Build',
    description: 'Build Granite App',
    examples: [['Build Granite App', 'granite build']],
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
      const { cache = true, metafile = false, dev = false } = this;
      const config = await loadConfig();
      const options = (['android', 'ios'] as const).map((platform) => ({
        dev,
        cache,
        metafile,
        platform,
        outfile: `bundle.${platform}.js`,
      }));

      await BuildUtils.buildAll(options, { config, plugins: [statusPlugin] });

      return 0;
    } catch (error: any) {
      console.error(error);

      return 1;
    }
  }
}
