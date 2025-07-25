import { runServer, EXPERIMENTAL__server } from '@granite-js/mpack';
import { Command, Option } from 'clipanion';
import Debug from 'debug';
import { loadConfig } from '../../config/loadConfig';

const debug = Debug('cli');

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
        await EXPERIMENTAL__server({ config, ...serverOptions });
      } else {
        await runServer({
          config,
          enableEmbeddedReactDevTools: !this.disableEmbeddedReactDevTools,
          ...serverOptions,
        });
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
