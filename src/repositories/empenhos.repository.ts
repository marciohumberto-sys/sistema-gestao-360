import { empenhosTable } from '../mocks/db.empenhos';
import { Empenho } from '../types';

class EmpenhosRepository {
    private data = empenhosTable;

    public async list(): Promise<Empenho[]> {
        return [...this.data];
    }

    public async listByContract(contractId: string): Promise<Empenho[]> {
        return this.data.filter(emp => emp.contractId === contractId);
    }

    public async getMetrics(): Promise<{ totalValue: number; count: number; activeValue: number }> {
        const totalValue = this.data.reduce((sum, emp) => sum + emp.value, 0);
        const count = this.data.length;
        const activeValue = this.data
            .filter(emp => emp.status !== 'PAGO')
            .reduce((sum, emp) => sum + emp.value, 0);

        return { totalValue, count, activeValue };
    }

    public async totalByContract(contractId: string): Promise<number> {
        return this.data
            .filter(emp => emp.contractId === contractId)
            .reduce((sum, emp) => sum + emp.value, 0);
    }
}

export const empenhosRepository = new EmpenhosRepository();
