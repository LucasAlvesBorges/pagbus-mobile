import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { AuthButton, AuthTextInput } from '../../components/auth';
import { authService } from '../../services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const [matricula, setMatricula] = useState('araujo.pagbus');
  const [password, setPassword] = useState('4705');
  const [errors, setErrors] = useState<{ matricula?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const validationErrors: typeof errors = {};

    if (!matricula.trim()) {
      validationErrors.matricula = 'Informe sua matrícula.';
    }

    if (!password.trim()) {
      validationErrors.password = 'Informe sua senha.';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      await authService.login({
        username: matricula.trim(),
        password,
      });

      setMatricula('');
      setPassword('');
      router.replace('/payment');
    } catch (error: any) {
      console.error('Erro ao realizar login:', error);

      const message =
        error?.message ||
        error?.data?.detail ||
        'Não foi possível realizar o login. Verifique suas credenciais.';

      Alert.alert('Erro ao entrar', message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="bus" size={54} color="#fff" />
            </View>
          </View>

          <Text style={styles.title}>PagBus{'\n'}Bem-vindo!</Text>

          <View style={styles.form}>
            <AuthTextInput
              label="Matrícula"
              autoCapitalize="none"
              placeholder="Digite sua matrícula"
              value={matricula}
              onChangeText={(value) => {
                setErrors((prev) => ({ ...prev, matricula: undefined }));
                setMatricula(value);
              }}
              keyboardType="default"
              containerStyle={styles.fieldSpacing}
              errorMessage={errors.matricula}
              returnKeyType="next"
            />

            <AuthTextInput
              label="Senha"
              autoCapitalize="none"
              placeholder="Digite sua senha"
              value={password}
              secureTextEntry
              enablePasswordToggle
              onChangeText={(value) => {
                setErrors((prev) => ({ ...prev, password: undefined }));
                setPassword(value);
              }}
              containerStyle={styles.fieldSpacing}
              errorMessage={errors.password}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />

            <AuthButton
              title="Entrar"
              onPress={handleLogin}
              loading={loading}
              disabled={!matricula.trim() || !password.trim()}
              style={styles.primaryButton}
            />

  
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#dfe6f5',
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#226BFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#226BFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1b1d29',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 38,
  },
  form: {
    width: '100%',
    paddingHorizontal: 8,
  },
  fieldSpacing: {
    marginBottom: 20,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 32,
  },
  forgotText: {
    color: '#226BFF',
    fontWeight: '600',
  },
  primaryButton: {
    marginBottom: 28,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#66708c',
    fontSize: 15,
  },
  footerLink: {
    color: '#226BFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
