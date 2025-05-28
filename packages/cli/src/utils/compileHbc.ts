import assert from 'assert';
import os from 'os';
import path from 'path';
import { isNotNil } from 'es-toolkit';
import execa from 'execa';

interface CompileHbcOptions {
  rootDir: string;
  filePath: string;
  sourcemap?: boolean;
}

const binary = {
  Darwin: 'react-native/sdks/hermesc/osx-bin/hermesc',
  Linux: 'react-native/sdks/hermesc/linux64-bin/hermesc',
  Windows_NT: 'react-native/sdks/hermesc/win64-bin/hermesc.exe',
} as const;

export async function compileHbc({ rootDir, filePath, sourcemap }: CompileHbcOptions) {
  const binary = getHermesc(rootDir);
  const outfile = path.resolve(rootDir, filePath.replace(new RegExp(`${path.extname(filePath)}$`), '.hbc'));

  await execa(
    binary,
    [
      // Disable warnings
      '-w',
      // Expensive optimizations
      '-O',
      // Emit binary
      '-emit-binary',
      // Emit source map
      sourcemap ? '-output-source-map' : null,
      // Output path
      '-out',
      outfile,
      filePath,
    ].filter(isNotNil)
  );

  return { outfile, sourcemapOutfile: sourcemap ? `${outfile}.map` : null };
}

function getHermesc(rootDir: string) {
  const os = getOs();
  const binarySource = binary[os];

  assert(binarySource, `지원하지 않는 OS 입니다: ${os}`);

  return resolveFromRoot(rootDir, binarySource);
}

function getOs() {
  return os.type() as 'Darwin' | 'Linux' | 'Windows_NT';
}

function resolveFromRoot(rootDir: string, request: string) {
  return require.resolve(request, { paths: [rootDir] });
}
