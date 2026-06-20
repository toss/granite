export const TOOL_TYPE_LIST = ['biome', 'eslint-prettier'] as const;

export type ToolType = (typeof TOOL_TYPE_LIST)[number];
