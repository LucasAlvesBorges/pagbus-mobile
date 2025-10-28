import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configuração de URLs por ambiente
const ENV_CONFIG = {
  development: {
    // Use uma dessas URLs para desenvolvimento
    LOCAL: 'http://localhost:8000/api/v1',
    NGROK: 'https://8e9d042408db.ngrok-free.app/api/v1',
    IOS_SIMULATOR: 'http://127.0.0.1:8000/api/v1',
  },
  production: {
    // Adicione a URL de produção aqui quando estiver pronto
    MAIN: 'https://api.pagbus.com.br/api/v1',
  },
};

// Detectar ambiente
const isDev = __DEV__;

const resolveExpoHost = (): string | undefined => {
  const expoGoConfig = Constants?.expoGoConfig;
  const expoConfig = Constants?.expoConfig;
  const manifest = (Constants as any)?.manifest;

  return (
    expoGoConfig?.debuggerHost ||
    expoGoConfig?.hostUri ||
    expoConfig?.hostUri ||
    manifest?.debuggerHost ||
    manifest?.hostUri
  );
};

const resolveIOSDevURL = (): string => {
  const host = resolveExpoHost()?.split(':').shift();

  if (host) {
    return `http://${host}:8000/api/v1`;
  }

  return ENV_CONFIG.development.IOS_SIMULATOR;
};

// Selecionar URL baseada no ambiente
const getBaseURL = (): string => {
  if (isDev) {
    if (Platform.OS === 'ios') {
      return resolveIOSDevURL();
    }

    // Para desenvolvimento, use NGROK ou LOCAL
    // Mude aqui entre LOCAL e NGROK conforme necessário
    return ENV_CONFIG.development.NGROK;
    // return ENV_CONFIG.development.LOCAL;
  } else {
    // Para produção, use a URL de produção
    return ENV_CONFIG.production.MAIN;
  }
};

// Obter URL base
const BASE_URL = getBaseURL();

// Log da configuração (apenas em desenvolvimento)
if (isDev) {
  console.log('📱 Configuração da API:', {
    Ambiente: 'Development',
    BaseURL: BASE_URL,
    Plataforma: Platform.OS,
  });
}

// Cria instância do Axios
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor para adicionar token de autenticação (se necessário)
api.interceptors.request.use(
  async (config) => {
    try {
      // Buscar token do SecureStore
      const token = await SecureStore.getItemAsync('auth_token');
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Erro ao buscar token:', error);
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros globalmente
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Retorna apenas os dados da resposta
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Tratar erro 401 (não autorizado)
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        // Aqui você pode implementar refresh token se necessário
        // Por enquanto, apenas limpa o token
        await SecureStore.deleteItemAsync('auth_token');
        
        // Redirecionar para tela de login
        // navigation.navigate('Login');
      } catch (refreshError) {
        console.error('Erro ao fazer refresh token:', refreshError);
        return Promise.reject(refreshError);
      }

      return api(originalRequest);
    }

    // Tratar outros erros
    if (error.response) {
      // Erro com resposta do servidor
      const { status, data } = error.response;
      
      console.error('Erro na resposta:', {
        status,
        data,
      });

      // Lançar erro customizado
      return Promise.reject({
        status,
        message: (data as any)?.message || 'Erro ao processar requisição',
        data,
      });
    } else if (error.request) {
      // Erro na requisição (sem resposta)
      console.error('Erro na requisição:', error.request);
      
      return Promise.reject({
        status: 0,
        message: 'Erro de conexão. Verifique sua internet.',
      });
    } else {
      // Erro na configuração da requisição
      console.error('Erro na configuração:', error.message);
      
      return Promise.reject({
        status: 0,
        message: error.message || 'Erro desconhecido',
      });
    }
  }
);

// Funções auxiliares para requisições comuns
export const apiService = {
  // GET
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.get(url, config);
  },

  // POST
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.post(url, data, config);
  },

  // PUT
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.put(url, data, config);
  },

  // PATCH
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.patch(url, data, config);
  },

  // DELETE
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.delete(url, config);
  },
};

export default api;
