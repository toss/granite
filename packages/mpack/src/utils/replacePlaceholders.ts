export function replacePlaceholders(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (prev, [placeholder, value]) => prev.replaceAll(`{${placeholder}}`, value.toString()),
    template
  );
}
