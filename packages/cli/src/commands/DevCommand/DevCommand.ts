import { loadConfig } from '@granite-js/plugin-core';
import { Command, Option } from 'clipanion';
import { ExitCode } from '../../constants';
import { errorHandler } from '../../utils/command';
import { runRollipopServer } from '../../utils/rollipop';

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

  disableEmbeddedReactDevTools = Option.Boolean('--disable-embedded-react-devtools', false);

  experimental = Option.Boolean('--experimental', false);
  experimentalMode = Option.Boolean('--experimental-mode', false);

  async execute() {
    try {
      const config = await loadConfig({ configFile: this.configFile });
      const port = this.port ? parseInt(this.port, 10) : undefined;

      if (this.experimental || this.experimentalMode) {
        await runRollipopServer(config, { port, host: this.host, cache: this.cache ?? false });
      } else {
        const { runServer } = await import('@granite-js/mpack');
        await runServer({
          config,
          port,
          host: this.host,
          enableEmbeddedReactDevTools: !this.disableEmbeddedReactDevTools,
        });
      }

      return ExitCode.SUCCESS;
    } catch (error: unknown) {
      return errorHandler(error);
    }
  }
}
