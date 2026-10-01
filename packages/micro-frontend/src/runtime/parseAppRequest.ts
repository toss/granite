import type { AppRequest } from '../types';
import { InvalidAppRequestError } from './errors';

export interface ParsedAppRequest {
  readonly appName: string;
  readonly exposedModule: string;
}

export function parseAppRequest(request: AppRequest): ParsedAppRequest {
  const separatorIndex = request.indexOf('/');
  const appName = request.slice(0, separatorIndex);
  const moduleName = request.slice(separatorIndex + 1);

  if (separatorIndex <= 0 || moduleName.length === 0) {
    throw new InvalidAppRequestError(request);
  }

  return {
    appName,
    exposedModule: moduleName.startsWith('./') ? moduleName : `./${moduleName}`,
  };
}
