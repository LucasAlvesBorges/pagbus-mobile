import { apiService } from './api';

export interface Tariff {
  id: number;
  value: string;
}

export interface BusLine {
  id: number;
  name: string;
  busline_code: string;
  company: number;
  tariffs: Tariff[];
}

class BusLineService {
  async getBusLines(companyId?: number): Promise<BusLine[]> {
    const params = companyId ? `?company_id=${companyId}` : '';
    const url = `/buslines/${params}`;
    return apiService.get(url);
  }

  async getBusLineById(id: number): Promise<BusLine> {
    return apiService.get(`/buslines/${id}/`);
  }

  async getTariffs(): Promise<Tariff[]> {
    return apiService.get('/tariffs/');
  }
}

export const buslineService = new BusLineService();
export default buslineService;

