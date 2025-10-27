import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface AuthTextInputProps extends TextInputProps {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
  errorMessage?: string;
  enablePasswordToggle?: boolean;
}

export function AuthTextInput({
  label,
  style,
  containerStyle,
  errorMessage,
  secureTextEntry,
  enablePasswordToggle = false,
  ...rest
}: AuthTextInputProps) {
  const [isSecure, setIsSecure] = useState(!!secureTextEntry);

  const toggleSecureTextEntry = () => {
    if (enablePasswordToggle) {
      setIsSecure((prev) => !prev);
    }
  };

  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          {...rest}
          style={[styles.input, style]}
          placeholderTextColor="#90A4C8"
          secureTextEntry={isSecure}
        />

        {enablePasswordToggle && (
          <TouchableOpacity style={styles.iconButton} onPress={toggleSecureTextEntry} activeOpacity={0.7}>
            <Ionicons name={isSecure ? 'eye-off-outline' : 'eye-outline'} size={22} color="#4A6BF2" />
          </TouchableOpacity>
        )}
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1d29',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#e9f1ff',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1b1d29',
  },
  iconButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -11 }],
    padding: 4,
  },
  errorText: {
    marginTop: 6,
    color: '#d14343',
    fontSize: 13,
  },
});
