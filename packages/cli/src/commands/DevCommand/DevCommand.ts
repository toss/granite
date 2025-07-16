import assert from 'assert';
import * as mpack from '@granite-js/mpack';
import { resolvePlugins } from '@granite-js/plugin-core';
import { Command, Option } from 'clipanion';
import Debug from 'debug';
import { loadConfig } from '../../config/loadConfig';
import { mergeTransformFromPlugins } from '../../config/mergeTransformFromPlugins';

const debug = Debug('cli');

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_LOCALHOST_PORT = 8081;

export class DevCommand extends Command {
  static paths = [[`dev`]];

  static usage = Command.Usage({
    category: 'Development',
    description: 'Granite 개발 서버를 실행합니다',
    examples: [['개발 서버 실행하기', 'granite dev']],
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

      assert(config?.appName, '앱 이름을 찾을 수 없습니다');

      debug('StartCommand', {
        ...serverOptions,
        disableEmbeddedReactDevTools: this.disableEmbeddedReactDevTools,
        experimentalMode: this.experimentalMode,
      });

      if (this.experimentalMode) {
        const mpackConfig = config.mpack.devServer.config;
        const mpackDevServerConfig = mpackConfig?.devServer;

        assert(mpackDevServerConfig, 'mpack dev server 설정을 찾을 수 없습니다');

        await mpack.experimental_runServer({
          appName: config.appName,
          scheme: config.scheme,
          devServerConfig: mpackDevServerConfig,
          host: serverOptions.host,
          port: serverOptions.port,
        });
      } else {
        const resolvedPlugins = await resolvePlugins(config.plugins);
        const mergedTransform = await mergeTransformFromPlugins(resolvedPlugins.plugins);
        const additionalMetroConfig = {
          ...config.metro,
          transformSync: mergedTransform?.transformSync,
        };

        for (const preHandler of resolvedPlugins.devServer.preHandlers) {
          debug('preHandler', preHandler);
          await preHandler?.({
            host: serverOptions.host || DEFAULT_HOST,
            port: serverOptions.port || DEFAULT_LOCALHOST_PORT,
            appName: config.appName,
            outdir: config.outdir,
            cwd: config.cwd,
            entryFile: config.entryFile,
          });
        }

        await mpack.runServer({
          cwd: config.cwd,
          host: serverOptions.host,
          port: serverOptions.port,
          middlewares: config.mpack.devServer.middlewares,
          config: config.mpack.devServer.config,
          onServerReady: async () => {
            for (const postHandler of resolvedPlugins.devServer.postHandlers) {
              debug('postHandler', postHandler);
              await postHandler?.({
                host: serverOptions.host || DEFAULT_HOST,
                port: serverOptions.port || DEFAULT_LOCALHOST_PORT,
                appName: config.appName,
                outdir: config.outdir,
                cwd: config.cwd,
                entryFile: config.entryFile,
              });
            }
          },
          enableEmbeddedReactDevTools: !this.disableEmbeddedReactDevTools,
          additionalConfig: additionalMetroConfig,
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
