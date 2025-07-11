import pc from 'picocolors';

const tag = pc.bold(pc.bgCyan(pc.black(' SHARED ')));

export function log(...args: any[]) {
  console.log(tag, ...args);
}
