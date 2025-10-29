import * as SecureStore from 'expo-secure-store';

const SELECTION_KEY = 'user_bus_selection';

export interface BusSelection {
  busLineId: string;
  busLineName: string;
  busLineCode: string;
  busLineCompany: string;
  vehiclePrefix: string;
}

class SelectionService {
  /**
   * Salvar seleção de linha e veículo
   */
  async saveSelection(selection: BusSelection): Promise<void> {
    try {
      await SecureStore.setItemAsync(SELECTION_KEY, JSON.stringify(selection));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Carregar seleção salva
   */
  async loadSelection(): Promise<BusSelection | null> {
    try {
      const data = await SecureStore.getItemAsync(SELECTION_KEY);
      if (data) {
        const selection = JSON.parse(data);
        return selection;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Limpar seleção salva
   */
  async clearSelection(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SELECTION_KEY);
    } catch (error) {
      // Erro silencioso
    }
  }
}

export const selectionService = new SelectionService();

