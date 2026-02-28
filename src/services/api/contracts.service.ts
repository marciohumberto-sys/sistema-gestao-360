import { httpClient } from './httpClient';
import { ENDPOINTS } from './endpoints';
import { Contract, DashboardMetrics } from '../../types';

class ContractsService {
    async list(): Promise<Contract[]> {
        return httpClient(ENDPOINTS.contracts.list);
    }

    async getById(id: string): Promise<Contract> {
        return httpClient(ENDPOINTS.contracts.detail(id));
    }

    async create(data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract> {
        return httpClient(ENDPOINTS.contracts.create, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async update(id: string, data: Partial<Contract>): Promise<Contract> {
        return httpClient(ENDPOINTS.contracts.update(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async remove(id: string): Promise<void> {
        return httpClient(ENDPOINTS.contracts.delete(id), {
            method: 'DELETE'
        });
    }

    async getDashboardMetrics(): Promise<DashboardMetrics> {
        return httpClient(ENDPOINTS.contracts.metrics);
    }
}

export const contractsService = new ContractsService();
