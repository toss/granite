import chalk from 'chalk';
import { isNotNil } from 'es-toolkit';
import { isDebugMode } from '../utils/isDebugMode';

type LogLevel = 'trace' | 'debug' | 'info' | 'log' | 'warn' | 'error';

type SerializableType = string | number | boolean | object | null | undefined;

class Logger {
  private static LEVEL_COLOR: Record<LogLevel, chalk.Chalk> = {
    trace: chalk.gray,
    debug: chalk.gray,
    info: chalk.cyan,
    log: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
  };

  trace(...messages: SerializableType[]) {
    if (isDebugMode('mpack')) {
      this.stdout(this.createLogString('trace', ...messages));
    }
  }

  debug(...messages: SerializableType[]) {
    if (isDebugMode('mpack')) {
      this.stdout(this.createLogString('debug', ...messages));
    }
  }

  info(...messages: SerializableType[]) {
    this.stdout(this.createLogString('info', ...messages));
  }

  log(...messages: SerializableType[]) {
    this.stdout(this.createLogString('log', ...messages));
  }

  warn(...messages: SerializableType[]) {
    this.stderr(this.createLogString('warn', ...messages));
  }

  error(...messages: SerializableType[]) {
    this.stderr(this.createLogString('error', ...messages));
  }

  getTimestamp() {
    const date = new Date();

    const yyyy = date.getFullYear();
    const MM = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');

    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    const sss = date.getMilliseconds().toString().padStart(3, '0');

    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}.${sss}`;
  }

  private stdout(buffer: string) {
    process.stdout.write(buffer);
  }

  private stderr(buffer: string) {
    process.stderr.write(buffer);
  }

  private stringify(value: SerializableType) {
    if (value instanceof Error) {
      return value.toString();
    }

    switch (typeof value) {
      case 'string':
        return value;

      case 'number':
      case 'boolean':
        return value.toString();

      case 'undefined':
        return 'undefined';

      case 'object':
        return JSON.stringify(value, null, 2);

      default:
        return null;
    }
  }

  private createLogString(level: LogLevel, ...messages: SerializableType[]) {
    const timestamp = chalk.gray(this.getTimestamp());
    const coloredLevel = Logger.LEVEL_COLOR[level](chalk.bold(level));
    const message = messages.map(this.stringify).filter(isNotNil).join(' ');

    return `${timestamp} ${coloredLevel} ${message}\n`;
  }
}

export const logger = new Logger();
