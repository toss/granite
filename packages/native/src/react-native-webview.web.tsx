import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';

type WebViewSource = {
  uri?: string;
  html?: string;
};

export type WebViewProps = {
  source?: WebViewSource;
  style?: StyleProp<ViewStyle>;
};

const iframeStyle: React.CSSProperties = {
  border: 0,
  width: '100%',
  height: '100%',
};

export function WebView({ source, style }: WebViewProps) {
  const uri = source?.uri;
  const html = source?.html;

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      {uri || html ? <iframe src={uri} srcDoc={html} style={iframeStyle} title={uri || 'webview'} /> : null}
    </View>
  );
}

export default WebView;
