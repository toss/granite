export interface HermesPluginOptions {
  /**
   * Optimization level.
   *
   * - `O0`: No optimization
   * - `Og`: Optimizations suitable for debugging
   * - `O`: Expensive optimizations
   *
   * Defaults to `O`.
   */
  optimization?: 'O0' | 'Og' | 'O';
  /**
   * Disable warning message.
   *
   * Defaults to `true`.
   */
  disableWarning?: boolean;
  /**
   * Emit source map.
   *
   * Defaults to `true`.
   */
  sourcemap?: boolean;
  /**
   * Path to hermesc binary.
   *
   * Defaults to `hermesc` in `react-native/sdks/hermesc/<platform>/hermesc`.
   */
  binaryPath?: string;
}
