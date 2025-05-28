import { logger } from './Logger';
import type { ClientLogEvent } from '../server/types';

export const clientLogger = (level: ClientLogEvent['level'], data: any[]) => {
  switch (level) {
    case 'trace':
      logger.trace(...data);
      break;
    case 'debug':
      logger.debug(...data);
      break;

    case 'info':
      logger.info(...data);
      break;

    case 'warn':
      logger.warn(...data);
      break;

    case 'error':
      logger.error(...data);
      break;

    default:
      logger.log(...data);
  }
};
