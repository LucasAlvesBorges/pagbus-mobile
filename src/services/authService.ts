import * as SecureStore from 'expo-secure-store';

import { apiService } from './api';

const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  refresh: string;
  access: string;
}

export interface RegisterPayload {
  full_name: string;
  alias: string;
  role: string;
  card_code?: string;
  company_id: number;
}

class AuthService {
  private readonly baseUrl = '/employee';

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>(`${this.baseUrl}/login/`, credentials);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.access);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.refresh);
    return response;
  }

  async register(payload: RegisterPayload) {
    return apiService.post(`${this.baseUrl}/register/`, payload);
  }

  async logout() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  }

  async getStoredAccessToken() {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  }

  async getStoredRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }
}

export const authService = new AuthService();
export default authService;
