import { apiService } from './api';

export interface Vehicle {
  prefix: string;
  company: number;
}

class VehicleService {
  async getVehicles(companyId?: number): Promise<Vehicle[]> {
    const params = companyId ? `?company_id=${companyId}` : '';
    const url = `/vehicles/${params}`;
    return apiService.get(url);
  }

  async getVehicleByPrefix(prefix: string): Promise<Vehicle> {
    return apiService.get(`/vehicles/${prefix}/`);
  }
}

export const vehicleService = new VehicleService();
export default vehicleService;

