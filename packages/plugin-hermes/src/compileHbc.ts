import { isNotNil } from 'es-toolkit';
import execa from 'execa';
import type { HermesPluginOptions } from './types';

export interface CompileHbcOptions extends HermesPluginOptions {
  /**
   * Executable hermesc binary path.
   */
  hermesc: string;
  /**
   * JS bundle path.
   */
  jsBundle: string;
  /**
   * Output file path.
   */
  outfile: string;
}

export interface CompileHbcResult {
  hbc: string;
  hbcSourcemap: string | null;
}

const DEFAULT_OPTIONS: Required<Omit<HermesPluginOptions, 'outfile'>> = {
  disableWarning: true,
  optimization: 'O',
  sourcemap: true,
};

export async function compileHbc({
  hermesc,
  jsBundle,
  outfile,
  ...options
}: CompileHbcOptions): Promise<CompileHbcResult> {
  const completeOptions = { ...DEFAULT_OPTIONS, ...options };

  await execa(
    hermesc,
    [
      `-${completeOptions.optimization}`,
      completeOptions.disableWarning ? '-w' : null,
      completeOptions.sourcemap ? '-output-source-map' : null,
      ...getBaseArguments(outfile, jsBundle),
    ].filter(isNotNil)
  );

  return { hbc: outfile, hbcSourcemap: completeOptions.sourcemap ? `${outfile}.map` : null };
}

function getBaseArguments(outfile: string, jsBundle: string) {
  return ['-emit-binary', '-out', outfile, jsBundle];
}
