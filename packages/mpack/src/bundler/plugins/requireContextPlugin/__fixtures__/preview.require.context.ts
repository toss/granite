
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const previewContext = require.context('../../', true, /\.preview\.tsx$/);

export const previews: any[] = (previewContext as any)
  .keys()
  .filter((key: string) => key.startsWith('./'))
  .map((key: string) => previewContext(key).default)
  .filter(Boolean);

export function findPreview(key: string): any | undefined {
  return previews.find(p => p.key === key);
}

export function normalizeGroup(group: string | string[] | undefined): string[] {
  if (group == null) return ['Ungrouped'];
  if (typeof group === 'string') return [group];
  return group.length === 0 ? ['Ungrouped'] : group;
}
