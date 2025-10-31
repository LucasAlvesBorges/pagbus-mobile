import * as SecureStore from 'expo-secure-store';
import { apiService } from './api';

const ACTIVE_JOURNEY_KEY = 'active_journey_id';

export interface Journey {
  id: number;
  user: number;
  user_name: string;
  company: number;
  company_id: number;
  company_name: string;
  bus_line: number | null;
  bus_line_name: string | null;
  bus_line_code: string | null;
  vehicle: number | null;
  vehicle_prefix: string | null;
  total_amount: string;
  total_passengers: number;
  finalizada: boolean;
  opened_hours: string | null;
  opened_hours_display: string | null;
  payments_count: number;
  created_at: string;
  finalized_at: string | null;
  updated_at: string;
}

export interface JourneyCreateRequest {
  bus_line: number;
  vehicle_prefix: string;
}

class JourneyService {
  private baseUrl = '/employee';

  /**
   * Cria uma nova jornada
   */
  async createJourney(data: JourneyCreateRequest): Promise<Journey> {
    try {
      const response = await apiService.post<Journey>(
        `${this.baseUrl}/journeys/`,
        data
      );
      
      // Salvar ID da jornada ativa no SecureStore
      await SecureStore.setItemAsync(ACTIVE_JOURNEY_KEY, response.id.toString());
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca a jornada ativa do usuário
   */
  async getActiveJourney(): Promise<Journey | null> {
    try {
      const response = await apiService.get<Journey>(
        `${this.baseUrl}/journeys/active/`
      );
      
      // Atualizar ID da jornada ativa no SecureStore
      await SecureStore.setItemAsync(ACTIVE_JOURNEY_KEY, response.id.toString());
      
      return response;
    } catch (error: any) {
      // Se não encontrar jornada ativa (404), retornar null
      if (error?.status === 404) {
        await SecureStore.deleteItemAsync(ACTIVE_JOURNEY_KEY);
        return null;
      }
      throw error;
    }
  }

  /**
   * Busca uma jornada por ID
   */
  async getJourneyById(journeyId: number): Promise<Journey> {
    try {
      const response = await apiService.get<Journey>(
        `${this.baseUrl}/journeys/${journeyId}/`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lista todas as jornadas do usuário
   */
  async listJourneys(finalizada?: boolean): Promise<Journey[]> {
    try {
      const params = finalizada !== undefined ? `?finalizada=${finalizada}` : '';
      const response = await apiService.get<Journey[]>(
        `${this.baseUrl}/journeys/${params}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Finaliza uma jornada
   * Retorna null se a jornada foi deletada (sem pagamentos), caso contrário retorna a jornada finalizada
   */
  async finalizeJourney(journeyId: number): Promise<Journey | null> {
    try {
      const response = await apiService.post<Journey | { detail: string }>(
        `${this.baseUrl}/journeys/${journeyId}/finalize/`
      );
      
      // Se a resposta contém apenas 'detail', significa que a jornada foi deletada
      if ('detail' in response && !('id' in response)) {
        // Limpar jornada ativa do SecureStore
        await SecureStore.deleteItemAsync(ACTIVE_JOURNEY_KEY);
        return null;
      }
      
      // Caso contrário, retornar a jornada finalizada
      const journey = response as Journey;
      
      // Limpar jornada ativa do SecureStore se esta foi finalizada
      const storedId = await SecureStore.getItemAsync(ACTIVE_JOURNEY_KEY);
      if (storedId === journeyId.toString()) {
        await SecureStore.deleteItemAsync(ACTIVE_JOURNEY_KEY);
      }
      
      return journey;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém o ID da jornada ativa armazenado localmente
   */
  async getStoredActiveJourneyId(): Promise<number | null> {
    try {
      const journeyId = await SecureStore.getItemAsync(ACTIVE_JOURNEY_KEY);
      return journeyId ? parseInt(journeyId, 10) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Salva o ID da jornada ativa localmente
   */
  async setStoredActiveJourneyId(journeyId: number): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACTIVE_JOURNEY_KEY, journeyId.toString());
    } catch (error) {
      throw error;
    }
  }

  /**
   * Limpa o ID da jornada ativa armazenado localmente
   */
  async clearStoredActiveJourneyId(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACTIVE_JOURNEY_KEY);
    } catch (error) {
      // Erro silencioso
    }
  }

  /**
   * Verifica e sincroniza a jornada ativa com o servidor
   */
  async syncActiveJourney(): Promise<Journey | null> {
    try {
      // Primeiro tentar buscar do servidor
      const activeJourney = await this.getActiveJourney();
      
      if (activeJourney) {
        return activeJourney;
      }
      
      // Se não encontrou no servidor, limpar do armazenamento local
      await this.clearStoredActiveJourneyId();
      return null;
    } catch (error) {
      // Em caso de erro, tentar usar o armazenado localmente
      const storedId = await this.getStoredActiveJourneyId();
      if (storedId) {
        try {
          const journey = await this.getJourneyById(storedId);
          // Verificar se ainda está ativa
          if (!journey.finalizada) {
            return journey;
          } else {
            // Se foi finalizada, limpar
            await this.clearStoredActiveJourneyId();
          }
        } catch (e) {
          // Se não encontrou, limpar
          await this.clearStoredActiveJourneyId();
        }
      }
      
      return null;
    }
  }

  /**
   * Busca os pagamentos de uma jornada específica
   */
  async getJourneyPayments(journeyId: number): Promise<any[]> {
    try {
      const response = await apiService.get<any[]>(
        `${this.baseUrl}/journeys/${journeyId}/payments/`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Faz download do PDF de uma jornada finalizada
   * Retorna o arrayBuffer do PDF para ser convertido em base64
   */
  async downloadJourneyPDF(journeyId: number): Promise<ArrayBuffer> {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const baseUrl = (await import('./api')).default.defaults.baseURL;
      const url = `${baseUrl}${this.baseUrl}/journeys/${journeyId}/download_pdf/`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erro ao baixar PDF' }));
        throw new Error(errorData.detail || 'Erro ao baixar PDF');
      }

      return await response.arrayBuffer();
    } catch (error) {
      throw error;
    }
  }
}

export const journeyService = new JourneyService();
export default journeyService;
