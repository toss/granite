declare function loadConfig(argv: any, defaultConfigOverrides: any): Promise<any>;
declare function mergeConfig(defaultConfig: any, ...configs: any[]): any;

export { loadConfig, mergeConfig };
