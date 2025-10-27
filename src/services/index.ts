/**
 * Arquivo centralizado de exportação dos serviços
 */

export { apiService, default as api } from './api';
export { paymentService, type PaymentRequest, type PaymentResponse } from './paymentService';
export { buslineService, type BusLine, type Tariff } from './buslineService';
export { vehicleService, type Vehicle } from './vehicleService';

