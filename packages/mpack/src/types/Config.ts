import type { DevServerConfig } from './DevServerConfig';
import type { ServicesConfig } from './ServicesConfig';
import type { TaskConfig } from './TaskConfig';

export interface Config {
  appName: string;
  scheme: string;
  commands?: unknown[];
  concurrency?: number;
  tasks: TaskConfig[];
  devServer?: DevServerConfig;
  services?: ServicesConfig;
}
