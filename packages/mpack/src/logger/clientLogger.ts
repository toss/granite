import { logger } from './Logger';

type ClientLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'log' | 'group' | 'groupCollapsed' | 'groupEnd';

export const clientLogger = (level: ClientLogLevel, data: any[]) => {
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
