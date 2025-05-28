import type { ProtocolConfig } from '@granite-js/mpack';
import type { OnLoadArgs } from 'esbuild';

export const graniteRequireProtocol: ProtocolConfig[string] = {
  load: (args: OnLoadArgs) => {
    return { loader: 'js', contents: `module.exports = __granite_require__('${args.path}');` };
  },
};
