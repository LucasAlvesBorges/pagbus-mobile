import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Configuração de URLs por ambiente
const ENV_CONFIG = {
  development: {
    // Use uma dessas URLs para desenvolvimento
    LOCAL: 'http://localhost:8000/api/v1',
    NGROK: 'https://5a7792fcac22.ngrok-free.app/api/v1',
    IOS_SIMULATOR: 'http://127.0.0.1:8000/api/v1',
  },
  production: {
    // Adicione a URL de produção aqui quando estiver pronto
    MAIN: 'https://pagbus.com/api/v1',
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
      // Silenciar erro
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
    if (error.response?.status === 401) {
      // Verificar se já tentou fazer refresh
      if (originalRequest?._retry) {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user_id');
        
        return Promise.reject({
          status: 401,
          message: 'Não autorizado. Faça login novamente.',
          data: error.response?.data,
        });
      }

      // Tentar fazer refresh token
      originalRequest._retry = true;
      
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        
        if (refreshToken) {
          try {
            const refreshResponse = await axios.post(`${BASE_URL.replace('/api/v1', '')}/api/token/refresh/`, {
              refresh: refreshToken
            });
            
            if (refreshResponse?.data?.access) {
              await SecureStore.setItemAsync('auth_token', refreshResponse.data.access);
              
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access}`;
              
              return api(originalRequest);
            }
          } catch {
            // Se o refresh falhar, continuar para limpar tokens
          }
        }
        
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user_id');
        
        return Promise.reject({
          status: 401,
          message: 'Sessão expirada. Faça login novamente.',
          data: error.response?.data,
        });
      } catch {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user_id');
        
        return Promise.reject({
          status: 401,
          message: 'Erro de autenticação. Faça login novamente.',
          data: error.response?.data,
        });
      }
    }

    // Tratar outros erros
    if (error.response) {
      // Erro com resposta do servidor
      const { status, data } = error.response;

      // Lançar erro customizado
      return Promise.reject({
        status,
        message: (data as any)?.message || (data as any)?.detail || 'Erro ao processar requisição',
        data,
      });
    } else if (error.request) {
      // Erro na requisição (sem resposta)
      return Promise.reject({
        status: 0,
        message: 'Erro de conexão. Verifique sua internet.',
      });
    } else {
      // Erro na configuração da requisição
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
