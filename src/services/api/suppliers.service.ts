import { httpClient } from './httpClient';
import { ENDPOINTS } from './endpoints';
import { Supplier } from '../../types';

class SuppliersService {
    async getAll(): Promise<Supplier[]> {
        return httpClient(ENDPOINTS.suppliers.list);
    }

    async getById(id: string): Promise<Supplier> {
        return httpClient(ENDPOINTS.suppliers.detail(id));
    }

    async create(data: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
        return httpClient(ENDPOINTS.suppliers.create, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
        return httpClient(ENDPOINTS.suppliers.update(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(id: string): Promise<void> {
        return httpClient(ENDPOINTS.suppliers.delete(id), {
            method: 'DELETE'
        });
    }
}

export const suppliersService = new SuppliersService();
