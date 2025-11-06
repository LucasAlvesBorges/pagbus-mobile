import { apiService } from './api';

// Tipos
export interface Tariff {
  id: number;
  name: string;
  value: number;
}

export interface PaymentRequest {
  company_id: number;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: string;
  }>;
  external_reference: string;
  front_url: string;
  // Campos opcionais para histórico
  bus_line_name?: string;
  bus_line_id?: string;
  vehicle_prefix?: string;
  user_id?: number;
  journey_id?: number;
}

export interface PaymentResponse {
  redirect_url: string;
  qr_code?: string;
  qr_code_base64?: string;
  copy_paste?: string;
  transaction: {
    id: string;
    payment_id?: string;
    payment_status: string;
    pagamento_url: string;
    preference_id: string;
    created_at: string;
    updated_at: string;
  };
}

export interface Company {
  id: number;
  name: string;
  cnpj: string;
  email: string;
}

class PaymentService {
  private baseUrl = '/payment';

  /**
   * Cria um pagamento no Mercado Pago
   */
  async createPayment(data: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await apiService.post<PaymentResponse>(
        `${this.baseUrl}/transactions/create_payment/`,
        data
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca uma transação por ID
   */
  async getTransaction(transactionId: string) {
    try {
      const response = await apiService.get(
        `${this.baseUrl}/transactions/${transactionId}/`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca o link de pagamento de uma transação
   */
  async getPaymentLink(transactionId: string) {
    try {
      const response = await apiService.get(
        `${this.baseUrl}/transactions/${transactionId}/get_payment_link/`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lista todas as transações (opcional)
   */
  async listTransactions() {
    try {
      const response = await apiService.get(`${this.baseUrl}/transactions/`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verifica o status de uma transação
   */
  async checkTransactionStatus(transactionId: string) {
    try {
      const response = await apiService.get(
        `${this.baseUrl}/transactions/${transactionId}/`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca o histórico de transações do usuário logado
   */
  async getUserTransactionHistory() {
    try {
      const response = await apiService.get(`${this.baseUrl}/history/`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cria um TransactionHistory de gratuidade (passagem gratuita)
   */
  async createGratuidade(data: {
    company_id: number;
    user_id?: number;
    journey_id?: number;
    bus_line_id?: string;
    vehicle_prefix?: string;
    image: string; // URI da imagem
  }) {
    try {
      // Criar FormData para enviar a imagem
      const formData = new FormData();
      
      // Adicionar campos ao FormData
      formData.append('company_id', data.company_id.toString());
      
      if (data.user_id) {
        formData.append('user_id', data.user_id.toString());
      }
      
      if (data.journey_id) {
        formData.append('journey_id', data.journey_id.toString());
      }
      
      if (data.bus_line_id) {
        formData.append('bus_line_id', data.bus_line_id);
      }
      
      if (data.vehicle_prefix) {
        formData.append('vehicle_prefix', data.vehicle_prefix);
      }
      
      // Adicionar a imagem
      // A URI pode ser file:// ou content:// no React Native
      const imageUri = data.image;
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);
      
      // Fazer requisição com FormData
      // Precisamos usar axios diretamente para enviar FormData
      const axios = (await import('axios')).default;
      
      // Obter token de autenticação
      const { getItemAsync } = await import('expo-secure-store');
      const token = await getItemAsync('auth_token');
      
      // Obter baseURL do api (usando a mesma lógica do api.ts)
      const apiModule = await import('./api');
      const apiInstance = apiModule.default;
      const baseURL = apiInstance.defaults?.baseURL || 'http://localhost:8000/api/v1';
      
      const response = await axios.post(
        `${baseURL}${this.baseUrl}/history/create_gratuidade/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

// Exportar instância singleton
export const paymentService = new PaymentService();
export default paymentService;

