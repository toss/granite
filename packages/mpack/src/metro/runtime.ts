import fs from 'fs/promises';
import path from 'path';

export async function writeEnvScript(rootPath: string, appName: string, scheme: string) {
  const script = getEnvScript(appName, scheme);

  const basePath = path.join(rootPath, '.granite');
  const filePath = path.join(basePath, '.env.js');

  await fs.access(basePath).catch(() => fs.mkdir(basePath));
  await fs.writeFile(filePath, script, { encoding: 'utf-8' });

  return { path: filePath };
}

function getEnvScript(appName: string, scheme: string) {
  const script = [
    'global.__granite = global.__granite || {};',
    `global.__granite.app = { name: ${appName.startsWith('babel:') ? appName.slice(6) : JSON.stringify(appName)}, scheme: ${JSON.stringify(scheme)} };`,
  ].join('\n');

  return script;
}
