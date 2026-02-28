import { httpClient } from './httpClient';
import { ENDPOINTS } from './endpoints';
import { Empenho } from '../../types';

export const empenhosService = {
    list: async (): Promise<Empenho[]> => {
        return httpClient(ENDPOINTS.empenhos.list);
    },
    listByContract: async (contractId: string): Promise<Empenho[]> => {
        return httpClient(ENDPOINTS.empenhos.listByContract(contractId));
    },
    getMetrics: async (): Promise<{ totalValue: number; count: number; activeValue: number }> => {
        return httpClient(ENDPOINTS.empenhos.metrics);
    },
    totalByContract: async (contractId: string): Promise<{ total: number }> => {
        return httpClient(ENDPOINTS.empenhos.totalByContract(contractId));
    }
};
