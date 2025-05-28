import referenceManifest from '../reference/manifest.json';

export function categorizeManifest(manifest: typeof referenceManifest, locale: 'en' | 'ko') {
  const categories = new Map<
    string,
    {
      collapsed?: boolean;
      items: { text: string; link: string }[];
    }
  >();

  Object.entries(manifest.documents).filter(([_, packageManifest]) => {
    const { items } = packageManifest.items[0];

    for (const item of items) {
      if (!categories.has(item.text)) {
        categories.set(item.text, { items: [] });
      }

      categories.set(item.text, {
        items: [
          /** */
          ...categories.get(item.text)!.items,
          ...item.items.map((x) => {
            const link = x.link.startsWith('/') ? x.link : `/${x.link}`;
            return {
              ...x,
              link: locale === 'en' ? link : `/${locale}${link}`,
            };
          }),
        ],
      });
    }
  });

  return Array.from(categories).map(([category, { items }]) => {
    return {
      text: category,
      collapsed: true,
      items,
    };
  });
}
