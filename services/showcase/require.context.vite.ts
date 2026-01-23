const modules = import.meta.glob('./pages/**/*.{ts,tsx}', { eager: true });

type ModuleRecord = Record<string, unknown>;

const normalizedModules: ModuleRecord = {};

for (const [key, value] of Object.entries(modules)) {
  const normalizedKey = key.replace(/^\.\/pages/, '.');
  normalizedModules[normalizedKey] = value;
}

function context(id: string) {
  const mod = normalizedModules[id];

  if (!mod) {
    throw new Error(`Module not found: ${id}`);
  }

  return mod;
}

context.keys = () => Object.keys(normalizedModules);
context.resolve = (id: string) => id;
context.id = 'vite-context';

export { context };
