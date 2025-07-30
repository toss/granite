import { Builtins, Cli } from 'clipanion';
import { BuildCommand, HermesCommand, DevCommand } from './commands';

const cli = new Cli({
  binaryLabel: 'granite',
  binaryName: 'granite',
  enableCapture: true,
});

export async function initialize() {
  cli.register(BuildCommand);
  cli.register(HermesCommand);
  cli.register(DevCommand);
  cli.register(Builtins.HelpCommand);

  cli.runExit(process.argv.slice(2));
}
