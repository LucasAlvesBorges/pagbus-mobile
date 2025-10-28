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
  const [matricula, setMatricula] = useState('araujo.pagbus');
  const [password, setPassword] = useState('4705');
  const [errors, setErrors] = useState<{ matricula?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [savePassword, setSavePassword] = useState(false);

  // Carregar credenciais salvas ao inicializar
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedMatricula = await SecureStore.getItemAsync('saved_matricula');
      const savedPassword = await SecureStore.getItemAsync('saved_password');
      const shouldSave = await SecureStore.getItemAsync('save_password');
      
      if (savedMatricula) setMatricula(savedMatricula);
      if (savedPassword) setPassword(savedPassword);
      if (shouldSave === 'true') setSavePassword(true);
    } catch (error) {
      // Ignorar erros ao carregar credenciais salvas
    }
  };

  const saveCredentials = async () => {
    try {
      if (savePassword) {
        await SecureStore.setItemAsync('saved_matricula', matricula);
        await SecureStore.setItemAsync('saved_password', password);
        await SecureStore.setItemAsync('save_password', 'true');
      } else {
        await SecureStore.deleteItemAsync('saved_matricula');
        await SecureStore.deleteItemAsync('saved_password');
        await SecureStore.deleteItemAsync('save_password');
      }
    } catch (error) {
      // Ignorar erros ao salvar credenciais
    }
  };

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

      // Salvar credenciais se solicitado
      await saveCredentials();

      setMatricula('');
      setPassword('');
      router.replace('/payment/select-busline');
    } catch (error: any) {
      const detail = error?.data?.detail || error?.message || '';
      
      // Verificar tipo específico de erro do backend
      if (detail === 'User not found.') {
        setErrors({
          matricula: 'Usuário não encontrado',
        });
      } else if (detail === 'Invalid password.') {
        setErrors({
          password: 'Senha incorreta',
        });
      } else if (detail.toLowerCase().includes('invalid credentials')) {
        // Fallback para outros tipos de erro de credenciais
        setErrors({
          matricula: 'Matrícula ou senha incorretos',
          password: 'Matrícula ou senha incorretos',
        });
      } else {
        // Erro genérico
        setErrors({
          matricula: 'Erro ao fazer login',
        });
      }
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
     borderColor: '#226BFF',
     marginRight: 12,
     alignItems: 'center',
     justifyContent: 'center',
     backgroundColor: '#fff',
   },
   checkboxChecked: {
     backgroundColor: '#226BFF',
   },
   savePasswordText: {
     fontSize: 16,
     color: '#1b1d29',
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
