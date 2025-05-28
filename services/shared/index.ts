import { Alert } from 'react-native';

try {
  require('./src/index').initialize();
} catch (error) {
  const message = (error instanceof Error ? error.stack : '') || String(error);
  Alert.alert(message);
}
