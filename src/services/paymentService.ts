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
}

export interface PaymentResponse {
  redirect_url: string;
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
      console.error('Erro ao criar pagamento:', error);
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
      console.error('Erro ao buscar transação:', error);
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
      console.error('Erro ao buscar link de pagamento:', error);
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
      console.error('Erro ao listar transações:', error);
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
      console.error('Erro ao verificar status da transação:', error);
      throw error;
    }
  }
}

// Exportar instância singleton
export const paymentService = new PaymentService();
export default paymentService;

