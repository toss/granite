import fs from 'fs';
import path from 'path';
import { Plugin } from 'esbuild';
import { toRequireContextExportScript, getRequireContextScript } from './scripts';
import { REQUIRE_CONTEXT_PROTOCOL } from '../../../constants';
import { normalizePath } from '../../../utils/esbuildUtils';

async function getFilePaths(rootDir: string, deep = true): Promise<string[]> {
  const filenames: string[] = [];

  const rootFilenames = await fs.readdirSync(rootDir);

  for await (const filename of rootFilenames) {
    const filePath = path.join(rootDir, filename);

    if (fs.lstatSync(filePath).isDirectory()) {
      if (deep) {
        filenames.push(...(await getFilePaths(filePath, deep)));
      }
    } else {
      filenames.push(filePath);
    }
  }

  return filenames;
}

/**
 * 파일에 require.context('(.*)')라고 하는 글자가 있으면,
 * require('require-context:$1') 로 바꾼다.
 */
export function requireContextPlugin(): Plugin {
  return {
    name: 'require-context-plugin',
    setup(build) {
      /**
       * require.context.ts|tsx 파일 중 require.context('./path/to/module') 라고 되어있는 텍스트가 있다면
       * "require-context:./path/to/module" 경로를 import & export 하는 코드로 변환합니다.
       */
      build.onLoad({ filter: /require\.context\.tsx?$/ }, async (args) => {
        const content = await fs.promises.readFile(args.path, 'utf8');

        return {
          loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts',
          contents: toRequireContextExportScript(content),
        };
      });

      /**
       * "require-context:./path/to/module" 로 되어있으면 ./path/to/module 로 resolve 합니다.
       * 쿼리스트링으로 deep / filter 파라미터를 전달받아 pluginData 에 파싱하여 전달합니다.
       */
      build.onResolve({ filter: new RegExp(`^${REQUIRE_CONTEXT_PROTOCOL}.*`) }, (args) => {
        const rawPath = args.path.slice(REQUIRE_CONTEXT_PROTOCOL.length);
        const qIdx = rawPath.indexOf('?');
        const contextPath = qIdx === -1 ? rawPath : rawPath.slice(0, qIdx);
        const params = new URLSearchParams(qIdx === -1 ? '' : rawPath.slice(qIdx + 1));

        const deep = params.get('deep') !== 'false';
        const filterSrc = params.get('filterSrc');
        const filterFlags = params.get('filterFlags') ?? '';
        const filter = filterSrc != null ? new RegExp(filterSrc, filterFlags) : undefined;

        return {
          namespace: 'require-context',
          path: contextPath,
          pluginData: {
            importer: args.resolveDir,
            deep,
            filter,
          },
        };
      });

      /**
       * Webpack 의 require.context 가 반환하는 값의 인터페이스와 맞춥니다.
       */
      build.onLoad({ namespace: 'require-context', filter: /.*/ }, async (args) => {
        const importer = args.pluginData?.importer;

        if (importer == null) {
          throw new Error(`importer가 주어져야 합니다.`);
        }

        const { deep, filter } = args.pluginData as { deep: boolean; filter?: RegExp };
        const targetDir = path.resolve(importer, args.path);
        const basePath = path.join(importer, args.path);

        const allPaths = await getFilePaths(targetDir, deep);
        const filePaths = filter ? allPaths.filter((fp) => filter.test(path.basename(fp))) : allPaths;

        const requireContextModules = filePaths.map((filePath, index) => {
          const pagePath = path.relative(basePath, filePath);
          const normalizedPagePath = normalizePath(pagePath);
          const normalizedFilePath = normalizePath(filePath);

          return {
            moduleIndex: index,
            relativePath: normalizedPagePath.startsWith('.') ? normalizedPagePath : `./${normalizedPagePath}`,
            absolutePath: normalizedFilePath,
          };
        });

        return {
          contents: getRequireContextScript(requireContextModules),
          resolveDir: importer,
        };
      });
    },
  };
}
