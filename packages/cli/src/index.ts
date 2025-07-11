import { Builtins, Cli, CommandClass } from 'clipanion';
import { cosmiconfig } from 'cosmiconfig';
import { BuildCommand, HermesCommand, DevCommand } from './commands';

const cli = new Cli({
  binaryLabel: 'granite',
  binaryName: 'granite',
  enableCapture: true,
});

export async function initialize() {
  const explorer = await cosmiconfig('mpack');
  const result = await explorer.search(process.cwd());

  cli.register(BuildCommand);
  cli.register(HermesCommand);
  cli.register(DevCommand);
  cli.register(Builtins.HelpCommand);

  if (Array.isArray(result?.config?.commands)) {
    (result?.config?.commands as CommandClass[]).forEach((command) => cli.register(command));
  }

  cli.runExit(process.argv.slice(2));
}

export * from './config';
