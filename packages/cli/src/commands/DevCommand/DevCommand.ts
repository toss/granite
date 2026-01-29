import { runServer, EXPERIMENTAL__server } from '@granite-js/mpack';
import { loadConfig } from '@granite-js/plugin-core';
import { Command, Option } from 'clipanion';
import Debug from 'debug';
import { ExitCode } from '../../constants';
import { errorHandler } from '../../utils/command';

const debug = Debug('cli');

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

  disableEmbeddedReactDevTools = Option.Boolean('--disable-embedded-react-devtools', false);

  // mpack dev-server
  experimentalMode = Option.Boolean('--experimental-mode');

  async execute() {
    try {
      process.env.MPACK_DEV_SERVER = 'true';

      const config = await loadConfig({ configFile: this.configFile });
      const serverOptions = {
        host: this.host,
        port: this.port ? parseInt(this.port, 10) : undefined,
      };

      debug('StartCommand', {
        ...serverOptions,
        disableEmbeddedReactDevTools: this.disableEmbeddedReactDevTools,
        experimentalMode: this.experimentalMode,
      });

      if (this.experimentalMode) {
        /**
         * @TODO Invoke pre and post handlers of devServer plugin hooks in experimental mode
         */
        await EXPERIMENTAL__server({ config, ...serverOptions });
      } else {
        await runServer({
          config,
          ...serverOptions,
        });
      }

      return ExitCode.SUCCESS;
    } catch (error: unknown) {
      return errorHandler(error);
    }
  }
}
