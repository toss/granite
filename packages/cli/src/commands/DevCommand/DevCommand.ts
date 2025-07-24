import * as mpack from '@granite-js/mpack';
import { Command, Option } from 'clipanion';
import Debug from 'debug';
import { startDevServer } from './startDevServer';
import { loadConfig } from '../../config/loadConfig';

const debug = Debug('cli');

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_LOCALHOST_PORT = 8081;

export class DevCommand extends Command {
  static paths = [[`dev`]];

  static usage = Command.Usage({
    category: 'Development',
    description: 'Run Granite development server',
    examples: [['Run Granite development server', 'granite dev']],
  });

  host = Option.String('--host');
  port = Option.String('--port');

  disableEmbeddedReactDevTools = Option.Boolean('--disable-embedded-react-devtools', false);

  // mpack dev-server
  experimentalMode = Option.Boolean('--experimental-mode');

  async execute() {
    try {
      process.env.MPACK_DEV_SERVER = 'true';

      const config = await loadConfig();
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
        await mpack.EXPERIMENTAL__runServer({
          buildConfig: config.build,
          host: serverOptions.host,
          port: serverOptions.port,
        });
      } else {
        await startDevServer(
          {
            host: serverOptions.host || DEFAULT_HOST,
            port: serverOptions.port || DEFAULT_LOCALHOST_PORT,
            disableEmbeddedReactDevTools: this.disableEmbeddedReactDevTools,
          },
          config
        );
      }
    } catch (error: any) {
      console.log(`ERROR OCCURRED`);
      console.log(error);
      console.log(error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}
