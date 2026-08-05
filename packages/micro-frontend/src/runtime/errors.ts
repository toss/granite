export class InvalidAppRequestError extends Error {
  readonly request: string;

  constructor(request: string) {
    super(`Invalid micro-frontend app request: '${request}'`);
    this.name = 'InvalidAppRequestError';
    this.request = request;
  }
}

export class InvalidAppNameError extends Error {
  readonly appName: string;

  constructor(appName: string) {
    super('Micro-frontend app name must not be empty');
    this.name = 'InvalidAppNameError';
    this.appName = appName;
  }
}

export class AppContainerNotFoundError extends Error {
  readonly appName: string;

  constructor(appName: string) {
    super(`App container '${appName}' was not registered after bundle evaluation`);
    this.name = 'AppContainerNotFoundError';
    this.appName = appName;
  }
}

export class AppContainerAlreadyRegisteredError extends Error {
  readonly appName: string;

  constructor(appName: string) {
    super(`App container '${appName}' is already registered`);
    this.name = 'AppContainerAlreadyRegisteredError';
    this.appName = appName;
  }
}

export class ExposedModuleNotFoundError extends Error {
  readonly appName: string;
  readonly exposedModule: string;

  constructor(appName: string, exposedModule: string) {
    super(`Could not resolve '${exposedModule}' from app container '${appName}'`);
    this.name = 'ExposedModuleNotFoundError';
    this.appName = appName;
    this.exposedModule = exposedModule;
  }
}

export class ExposedModuleAlreadyRegisteredError extends Error {
  readonly appName: string;
  readonly exposedModule: string;

  constructor(appName: string, exposedModule: string) {
    super(`Exposed module '${exposedModule}' is already registered in app container '${appName}'`);
    this.name = 'ExposedModuleAlreadyRegisteredError';
    this.appName = appName;
    this.exposedModule = exposedModule;
  }
}

export class SharedModuleAlreadyRegisteredError extends Error {
  readonly moduleName: string;

  constructor(moduleName: string) {
    super(`Shared module '${moduleName}' is already registered`);
    this.name = 'SharedModuleAlreadyRegisteredError';
    this.moduleName = moduleName;
  }
}

export class InvalidNativeRuntimeEventError extends Error {
  readonly eventName: string;
  readonly fieldName?: string;

  constructor(eventName: string, fieldName?: string) {
    const detail = fieldName == null ? '' : `: missing or invalid '${fieldName}'`;
    super(`Invalid native micro-frontend event '${eventName}'${detail}`);
    this.name = 'InvalidNativeRuntimeEventError';
    this.eventName = eventName;
    this.fieldName = fieldName;
  }
}
