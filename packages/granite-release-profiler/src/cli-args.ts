export interface ReleaseProfilerCliOptions {
  host: string;
  port: number;
}

const USAGE = [
  'Usage: granite-release-profiler [--host HOST] [--port PORT]',
  '',
  'Example:',
  '  granite-release-profiler',
].join('\n');

export function parseReleaseProfilerCliArgs(argv: string[]): ReleaseProfilerCliOptions {
  let host = 'localhost';
  let port = 8081;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg == null) {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      throw new Error(USAGE);
    }

    if (arg === '--host') {
      const value = argv[index + 1];
      if (value == null) {
        throw new Error(`Missing value for --host\n\n${USAGE}`);
      }
      host = value;
      index += 1;
      continue;
    }

    if (arg === '--port') {
      const value = argv[index + 1];
      const parsedPort = Number(value);
      if (value == null || !Number.isInteger(parsedPort) || parsedPort <= 0) {
        throw new Error(`Invalid value for --port\n\n${USAGE}`);
      }
      port = parsedPort;
      index += 1;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}\n\n${USAGE}`);
    }

    throw new Error(`Unknown argument: ${arg}\n\n${USAGE}`);
  }

  return {
    host,
    port,
  };
}
