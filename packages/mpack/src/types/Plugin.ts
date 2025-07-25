import type { BuildResult } from '@granite-js/plugin-core';
import type { INTERNAL__Id } from './Id';
import type { BundlerConfig } from '../types/BundlerConfig';

export interface Plugin extends Partial<BindThis<PluginHooks, PluginContext>> {
  name?: string;
}

export type Hooks = keyof Partial<PluginHooks>;

export type PluginHooks = {
  [K in keyof FunctionPluginHooks]: FunctionPluginHooks[K];
};

interface FunctionPluginHooks {
  prepare(config: BundlerConfig): void;
  buildStart(): void;
  buildEnd(buildResult: BuildResult): void;
  load(moduleCount: number): void;
}

type BindThis<T, ThisType> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer R ? (this: ThisType, ...args: Args) => R : T[K];
};

interface PluginContext {
  id: INTERNAL__Id;
}

export type PluginHandlers = {
  onStart?: () => void;
  onEnd?: () => void;
};

export type PluginFactory = (handlers?: PluginHandlers) => Plugin;
