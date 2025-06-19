import { StyleSheet, TextInput as BaseTextInput, type TextInputProps as BaseTextInputProps } from 'react-native';

interface TextInputProps extends Omit<BaseTextInputProps, 'style'> {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
}

export function TextInput({ placeholder, value, onChangeText, ...rest }: TextInputProps) {
  return (
    <BaseTextInput style={styles.input} placeholder={placeholder} value={value} onChangeText={onChangeText} {...rest} />
  );
}

const styles = StyleSheet.create({
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: '#202632',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },
});
