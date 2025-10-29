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
  showUserIcon?: boolean;
}

export function AuthTextInput({
  label,
  style,
  containerStyle,
  errorMessage,
  secureTextEntry,
  enablePasswordToggle = false,
  showUserIcon = false,
  ...rest
}: AuthTextInputProps) {
  const [isSecure, setIsSecure] = useState(!!secureTextEntry);

  const toggleSecureTextEntry = () => {
    if (enablePasswordToggle) {
      setIsSecure((prev) => !prev);
    }
  };

  const hasError = !!errorMessage;

  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, hasError && styles.inputWrapperError]}>
        <TextInput
          {...rest}
          style={[
            styles.input, 
            hasError && styles.inputError,
            (enablePasswordToggle || showUserIcon) && styles.inputWithIcon,
            style
          ]}
          placeholderTextColor="#A5DCC6"
          secureTextEntry={isSecure}
        />

        {showUserIcon && !enablePasswordToggle && (
          <View style={styles.iconContainer}>
            <Ionicons name="person-outline" size={22} color="#27C992" />
          </View>
        )}

        {enablePasswordToggle && (
          <TouchableOpacity 
            style={styles.iconContainer} 
            onPress={toggleSecureTextEntry} 
            activeOpacity={0.7}
          >
            <Ionicons name={isSecure ? 'eye-off-outline' : 'eye-outline'} size={22} color="#27C992" />
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
    color: '#fff',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#111C20',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#27C992',
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  iconContainer: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  inputWrapperError: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderRadius: 12,
  },
  inputError: {
    backgroundColor: '#111C20',
    color: '#FF6B6B',
  },
  errorText: {
    marginTop: 6,
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '500',
  },
});
