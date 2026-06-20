import type { AppType } from './appTypes';
import type { ToolType } from './toolTypes';

export const APP_TEMPLATE_MODULE_LIST = ['app-remote', 'app-shared'] as const;
export const TOOL_TEMPLATE_MODULE_LIST = ['tool-biome', 'tool-eslint-prettier'] as const;
export const TEMPLATE_MODULE_LIST = [...APP_TEMPLATE_MODULE_LIST, ...TOOL_TEMPLATE_MODULE_LIST] as const;

export type AppTemplateModuleName = (typeof APP_TEMPLATE_MODULE_LIST)[number];
export type ToolTemplateModuleName = (typeof TOOL_TEMPLATE_MODULE_LIST)[number];
export type TemplateModuleName = (typeof TEMPLATE_MODULE_LIST)[number];

export const APP_TYPE_TO_TEMPLATE_MODULE = {
  remote: 'app-remote',
  shared: 'app-shared',
} satisfies Record<AppType, AppTemplateModuleName>;

export const TOOL_TYPE_TO_TEMPLATE_MODULE = {
  biome: 'tool-biome',
  'eslint-prettier': 'tool-eslint-prettier',
} satisfies Record<ToolType, ToolTemplateModuleName>;
