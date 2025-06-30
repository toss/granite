import { StyleSheet, TouchableOpacity } from 'react-native';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
}

export function Checkbox({ checked, onPress }: CheckboxProps) {
  return <TouchableOpacity style={[styles.base, checked ? styles.checked : undefined]} onPress={onPress} />;
}

const styles = StyleSheet.create({
  base: {
    width: 24,
    height: 24,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#1e1e1e',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  checked: {
    backgroundColor: '#0064FF',
    borderColor: '#0064FF',
  },
});
