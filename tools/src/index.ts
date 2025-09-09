import { Command } from '@commander-js/extra-typings';
import { attw } from './commands/attw';
import { linkedPack } from './commands/linked-pack';

const program = new Command('tools');

program.description('A set of commands for Granite');
program.addCommand(linkedPack());
program.addCommand(attw());
program.parse();
