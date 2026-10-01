import * as fs from 'fs/promises';

export async function writeDebugIdInjectedSourcemap(sourcemapPath: string, debugId: string) {
  const sourcemapObject = await injectSentryDebugId(sourcemapPath, debugId);
  await fs.writeFile(sourcemapPath, JSON.stringify(sourcemapObject, null, 2), 'utf-8');
}

async function injectSentryDebugId(sourcemapPath: string, debugId: string) {
  const sourcemapContent = await fs.readFile(sourcemapPath, 'utf-8');
  const sourcemapObject = JSON.parse(sourcemapContent);

  sourcemapObject.debugId = debugId;

  return sourcemapObject;
}
