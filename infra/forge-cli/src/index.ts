import { Command } from '@commander-js/extra-typings';
import { deploy } from './commands/deploy';
import { deployList } from './commands/deployList';

const program = new Command('granite-forge');

program.description('A CLI tool for managing Granite applications');
program.addCommand(deploy());
program.addCommand(deployList());
program.parse();
