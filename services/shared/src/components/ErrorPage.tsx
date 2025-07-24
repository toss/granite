import { View, Text, StyleSheet, TouchableOpacity, DevSettings } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ErrorPageProps {
  reason?: string;
}

export function ErrorPage(props: ErrorPageProps) {
  const handleRetry = () => {
    DevSettings.reload();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.title}>Oops! Something went wrong</Text>
        <Text style={styles.subtitle}>We encountered an issue with React Native Framework.</Text>
        <Text style={styles.errorReason}>{props.reason ?? 'Unknown error'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Reload</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
    fontWeight: '300',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    maxWidth: 300,
  },
  errorReason: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 20,
    fontStyle: 'italic',
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: '#0064FF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#0064FF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
