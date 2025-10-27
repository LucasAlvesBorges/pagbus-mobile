/**
 * Configuração de variáveis de ambiente
 * 
 * Para usar: crie um arquivo .env na raiz do projeto com as variáveis necessárias
 */

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const ENV = {
  API_URL,
  IS_DEV: __DEV__,
  IS_PRODUCTION: !__DEV__,
};

// Log de configuração (apenas em desenvolvimento)
if (__DEV__) {
  console.log('📱 Configuração do App:', {
    API_URL,
    Environment: __DEV__ ? 'Development' : 'Production',
  });
}

export default ENV;

