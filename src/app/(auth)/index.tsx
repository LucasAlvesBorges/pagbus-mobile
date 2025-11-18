import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { AuthButton, AuthTextInput } from '../../components/auth';
import { authService } from '../../services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [savePassword, setSavePassword] = useState(false);

  // Carregar credenciais salvas ao inicializar
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedLogin = await SecureStore.getItemAsync('saved_login');
      const savedPassword = await SecureStore.getItemAsync('saved_password');
      const shouldSave = await SecureStore.getItemAsync('save_password');
      
      if (savedLogin) setLogin(savedLogin);
      if (savedPassword) setPassword(savedPassword);
      if (shouldSave === 'true') setSavePassword(true);
    } catch (error) {
      // Ignorar erros ao carregar credenciais salvas
    }
  };

  const saveCredentials = async () => {
    try {
      if (savePassword) {
        await SecureStore.setItemAsync('saved_login', login);
        await SecureStore.setItemAsync('saved_password', password);
        await SecureStore.setItemAsync('save_password', 'true');
      } else {
        await SecureStore.deleteItemAsync('saved_login');
        await SecureStore.deleteItemAsync('saved_password');
        await SecureStore.deleteItemAsync('save_password');
      }
    } catch (error) {
      // Ignorar erros ao salvar credenciais
    }
  };

  const validate = () => {
    const validationErrors: typeof errors = {};

    if (!login.trim()) {
      validationErrors.login = 'Informe seu login.';
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
        username: login.trim(),
        password,
      });

      // Salvar credenciais se solicitado
      await saveCredentials();

      setLogin('');
      setPassword('');
      router.replace('/(tabs)' as any);
    } catch (error: any) {
      const detail = error?.data?.detail || error?.message || '';
      
      // Verificar tipo específico de erro do backend
      if (detail === 'User not found.') {
        setErrors({
          login: 'Usuário não encontrado',
        });
      } else if (detail === 'Invalid password.') {
        setErrors({
          password: 'Senha incorreta',
        });
      } else if (detail.toLowerCase().includes('invalid credentials')) {
        // Fallback para outros tipos de erro de credenciais
        setErrors({
          login: 'Login ou senha incorretos',
          password: 'Login ou senha incorretos',
        });
      } else {
        // Erro genérico
        setErrors({
          login: 'Erro ao fazer login',
        });
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar style="dark" hidden />

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

          <Text style={styles.title}>Acesso do Operador</Text>
          <Text style={styles.subtitle}>Bem-vindo! Faça seu login para continuar.</Text>

          <View style={styles.form}>
            <AuthTextInput
              label="Login"
              autoCapitalize="none"
              placeholder="Digite seu login"
              value={login}
              onChangeText={(value) => {
                setErrors((prev) => ({ ...prev, login: undefined }));
                setLogin(value);
              }}
              keyboardType="default"
              containerStyle={styles.fieldSpacing}
              errorMessage={errors.login}
              returnKeyType="next"
              showUserIcon={true}
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

             {/* Checkbox para salvar senha */}
             <TouchableOpacity 
               style={styles.savePasswordContainer}
               onPress={() => setSavePassword(!savePassword)}
               activeOpacity={0.7}
             >
               <View style={[styles.checkbox, savePassword && styles.checkboxChecked]}>
                 {savePassword && <Ionicons name="checkmark" size={16} color="#fff" />}
               </View>
               <Text style={styles.savePasswordText}>Salvar senha</Text>
             </TouchableOpacity>

             <AuthButton
              title="Entrar"
              onPress={handleLogin}
              loading={loading}
              disabled={!login.trim() || !password.trim()}
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
    backgroundColor: '#122017',
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
    backgroundColor: '#27C992',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#27C992',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#A5DCC6',
    textAlign: 'center',
    marginBottom: 28,
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
     color: '#27C992',
     fontWeight: '600',
   },
   savePasswordContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 20,
     paddingHorizontal: 8,
   },
   checkbox: {
     width: 20,
     height: 20,
     borderRadius: 4,
     borderWidth: 2,
     borderColor: '#27C992',
     marginRight: 12,
     alignItems: 'center',
     justifyContent: 'center',
     backgroundColor: '#122017',
   },
   checkboxChecked: {
     backgroundColor: '#27C992',
   },
   savePasswordText: {
     fontSize: 16,
     color: '#fff',
     fontWeight: '500',
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
