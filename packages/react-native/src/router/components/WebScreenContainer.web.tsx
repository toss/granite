import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

const WEB_HEADER_HEIGHT = 64;

export function WebScreenContainer({ children }: PropsWithChildren) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: WEB_HEADER_HEIGHT,
  },
});
