import { StyleSheet, TouchableOpacity, Text } from 'react-native';

interface ButtonProps {
  label: string;
  appearance?: 'default' | 'text';
  onPress: () => void;
}

export function Button({ label, appearance = 'default', onPress }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.buttonBase, appearance === 'default' ? styles.button : undefined]}
      onPress={onPress}
    >
      <Text style={appearance === 'default' ? styles.buttonText : styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  button: {
    backgroundColor: '#0064FF',
    shadowColor: '#000',
    borderRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  text: {
    color: '#202632',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
