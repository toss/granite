type RequireContext = {
  keys(): string[];
  (id: string): unknown;
  <T>(id: string): T;
  resolve(id: string): string;
  id: string;
};

declare const require: { context(directory: string, recursive: boolean, pattern: RegExp): RequireContext };

export const context = require.context('./pages', true, /\.[jt]sx?$/);
