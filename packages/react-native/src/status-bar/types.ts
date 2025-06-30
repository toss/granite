export type StatusBarStyle = 'light' | 'dark' | 'auto' | 'inverted';

export type StatusBarProps = {
  /**
   * @default 'auto'
   */
  style?: StatusBarStyle;
  hidden?: boolean;
  /**
   * @platform android
   */
  animated?: boolean;
  /**
   * @platform android
   */
  backgroundColor?: string;
  /**
   * @platform android
   */
  translucent?: boolean;
};
