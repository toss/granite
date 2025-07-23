import pc from 'picocolors';

const tag = pc.bold(pc.bgCyan(pc.black(' MICRO FRONTEND ')));

export function log(...args: any[]) {
  console.log(tag, ...args);
}
