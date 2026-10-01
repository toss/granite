export interface BuildOutputFile {
  path: string;
  contents: Uint8Array;
  readonly text: string;
}

/** A completed build. Adapters reject runBuild when a build fails. */
export interface BuildResult {
  bundle: { source: BuildOutputFile; sourcemap: BuildOutputFile };
  outfile: string;
  sourcemapOutfile: string;
  platform: 'android' | 'ios';
  extra?: Record<string, unknown>;
  totalModuleCount: number;
  duration: number;
  size: number;
}
