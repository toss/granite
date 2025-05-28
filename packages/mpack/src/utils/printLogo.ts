import chalk from 'chalk';

const LOGO = [
  ' ██████╗ ██████╗  █████╗ ███╗   ██╗██╗████████╗███████╗',
  '██╔════╝ ██╔══██╗██╔══██╗████╗  ██║██║╚══██╔══╝██╔════╝',
  '██║  ███╗██████╔╝███████║██╔██╗ ██║██║   ██║   █████╗  ',
  '██║   ██║██╔══██╗██╔══██║██║╚██╗██║██║   ██║   ██╔══╝  ',
  '╚██████╔╝██║  ██║██║  ██║██║ ╚████║██║   ██║   ███████╗',
  ' ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝   ╚══════╝',
];

const GREETING_MESSAGE = 'Welcome to Granite';

export function printLogo() {
  const maxLength = LOGO.reduce((prev, line) => Math.max(line.length, prev), 0);
  console.log();
  console.log(LOGO.join('\n'));

  const padding = new Array(Math.floor(maxLength / 2 - GREETING_MESSAGE.length / 2)).fill(' ').join('');
  console.log(`\n${padding}${chalk.blue(GREETING_MESSAGE)}\n`);
}
