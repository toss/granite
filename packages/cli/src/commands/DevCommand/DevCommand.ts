import { loadConfig } from '@granite-js/config';
import { Command, Option } from 'clipanion';
import { ExitCode } from '../../constants';
import { errorHandler } from '../../utils/command';

export class DevCommand extends Command {
  static paths = [[`dev`]];

  static usage = Command.Usage({
    category: 'Development',
    description: 'Run Granite development server',
    examples: [['Run Granite development server', 'granite dev']],
  });

  configFile = Option.String('--config', {
    description: 'Path to config file',
  });

  host = Option.String('--host');
  port = Option.String('--port');
  cache = Option.Boolean('--cache', {
    description: 'Enable cache',
  });

  async execute() {
    try {
      const config = await loadConfig({ configFile: this.configFile });
      const port = this.port ? parseInt(this.port, 10) : undefined;

      const server = await config.bundler.runServer({ port, host: this.host, cache: this.cache ?? false });
      const close = async () => {
        process.removeListener('SIGINT', close);
        process.removeListener('SIGTERM', close);
        try {
          await server.close();
          // Plugins may retain their own watchers after the bundler closes.
          process.exit(ExitCode.SUCCESS);
        } catch (error) {
          process.exit(errorHandler(error));
        }
      };
      process.once('SIGINT', close);
      process.once('SIGTERM', close);

      return ExitCode.SUCCESS;
    } catch (error: unknown) {
      return errorHandler(error);
    }
  }
}
