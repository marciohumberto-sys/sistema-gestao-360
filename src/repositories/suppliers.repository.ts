import { database } from '../mocks/db';
import { Supplier } from '../types';

export class SuppliersRepository {
    async findAll(): Promise<Supplier[]> {
        return [...database.suppliers];
    }

    async findById(id: string): Promise<Supplier | null> {
        return database.suppliers.find(sup => sup.id === id) || null;
    }

    async create(supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
        const newSupplier: Supplier = {
            ...supplier,
            id: `sup_${Date.now()}`,
            createdAt: new Date().toISOString()
        };
        database.suppliers.push(newSupplier);
        return newSupplier;
    }

    async update(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
        const index = database.suppliers.findIndex(sup => sup.id === id);
        if (index === -1) return null;

        const updated = { ...database.suppliers[index], ...updates };
        database.suppliers[index] = updated;
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const index = database.suppliers.findIndex(sup => sup.id === id);
        if (index === -1) return false;

        database.suppliers.splice(index, 1);
        return true;
    }
}

export const suppliersRepository = new SuppliersRepository();
