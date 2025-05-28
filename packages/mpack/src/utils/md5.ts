import * as crypto from 'crypto';

export function md5(...args: Array<string | number>) {
  return crypto.createHash('md5').update(args.join('')).digest('hex');
}
