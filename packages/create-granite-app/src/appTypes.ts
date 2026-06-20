export const APP_TYPE_LIST = ['remote', 'shared'] as const;

export type AppType = (typeof APP_TYPE_LIST)[number];
