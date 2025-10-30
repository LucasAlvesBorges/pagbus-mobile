import * as SecureStore from 'expo-secure-store';
import { apiService } from './api';

const ACTIVE_JOURNEY_KEY = 'active_journey_id';

export interface Journey {
  id: number;
  user: number;
  user_name: string;
  bus_line: number | null;
  bus_line_name: string | null;
  bus_line_code: string | null;
  vehicle: number | null;
  vehicle_prefix: string | null;
  total_amount: string;
  finalizada: boolean;
  opened_hours: string | null;
  opened_hours_display: string | null;
  payments_count: number;
  pdf: string | null;
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
   */
  async finalizeJourney(journeyId: number): Promise<Journey> {
    try {
      const response = await apiService.post<Journey>(
        `${this.baseUrl}/journeys/${journeyId}/finalize/`
      );
      
      // Limpar jornada ativa do SecureStore se esta foi finalizada
      const storedId = await SecureStore.getItemAsync(ACTIVE_JOURNEY_KEY);
      if (storedId === journeyId.toString()) {
        await SecureStore.deleteItemAsync(ACTIVE_JOURNEY_KEY);
      }
      
      return response;
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
}

export const journeyService = new JourneyService();
export default journeyService;
