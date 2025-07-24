import { Command, Option } from 'clipanion';
import { build } from './build';
import { loadConfig } from '../../config/loadConfig';

export class BuildCommand extends Command {
  static paths = [[`build`]];

  static usage = Command.Usage({
    category: 'Build',
    description: 'Build Granite App',
    examples: [['Build Granite App', 'granite build']],
  });

  disableCache = Option.Boolean('--disable-cache', {
    description: 'Disable cache',
  });

  async execute() {
    try {
      const { disableCache = false } = this;
      const config = await loadConfig();

      await build(config, {
        cache: !disableCache,
      });

      return 0;
    } catch (error: any) {
      console.error(error);

      return 1;
    }
  }
}
