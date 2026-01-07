import { Command, Option } from 'clipanion';
import * as Rollipop from 'rollipop';
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

  disableEmbeddedReactDevTools = Option.Boolean('--disable-embedded-react-devtools', false);

  // mpack dev-server
  experimentalMode = Option.Boolean('--experimental-mode');

  async execute() {
    try {
      const config = await Rollipop.loadConfig();

      await Rollipop.runServer(config, {
        port: this.port ? parseInt(this.port, 10) : undefined,
        host: this.host,
      });

      return ExitCode.SUCCESS;
    } catch (error: unknown) {
      return errorHandler(error);
    }
  }
}
