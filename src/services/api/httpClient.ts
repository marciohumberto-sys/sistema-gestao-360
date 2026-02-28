import { contractsRepository } from '../../repositories/contracts.repository';
import { suppliersRepository } from '../../repositories/suppliers.repository';
import { empenhosRepository } from '../../repositories/empenhos.repository';

/**
 * Fake delay to simulate network latency
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = () => delay(Math.floor(Math.random() * (450 - 250 + 1) + 250));

/**
 * Parses URL specifically specifically to match fake api endpoints
 */
const parseUrl = (url: string) => {
    // Expected formats: /api/contracts, /api/contracts/:id
    const parts = url.split('/').filter(Boolean);
    const domain = parts[1]; // contracts or suppliers
    const id = parts[2]; // optional id
    return { domain, id };
};

/**
 * Our mock fetch interceptor
 */
async function mockFetch(url: string, options?: RequestInit): Promise<Response> {
    await randomDelay(); // Simulate 250-450ms network delay

    const method = options?.method?.toUpperCase() || 'GET';
    const parsedUrl = new URL(url, 'http://localhost'); // Using fake base to parse URL properly
    const { domain, id } = parseUrl(parsedUrl.pathname);
    const searchParams = parsedUrl.searchParams;

    try {
        let body: any = null;
        if (options?.body) {
            body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        }

        // --- CONTRACTS DOMAIN ---
        if (domain === 'contracts') {
            if (id === 'metrics' && method === 'GET') {
                const metrics = await contractsRepository.getDashboardMetrics();
                return new Response(JSON.stringify(metrics), { status: 200 });
            }

            if (method === 'GET') {
                if (id) {
                    const data = await contractsRepository.getById(id);
                    return data ? new Response(JSON.stringify(data), { status: 200 }) : new Response('Not found', { status: 404 });
                } else {
                    const data = await contractsRepository.list();
                    return new Response(JSON.stringify(data), { status: 200 });
                }
            }
            if (method === 'POST') {
                const data = await contractsRepository.create(body);
                return new Response(JSON.stringify(data), { status: 201 });
            }
            if (method === 'PUT' && id) {
                const data = await contractsRepository.update(id, body);
                return data ? new Response(JSON.stringify(data), { status: 200 }) : new Response('Not found', { status: 404 });
            }
            if (method === 'DELETE' && id) {
                const success = await contractsRepository.remove(id);
                return success ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 });
            }
        }

        // --- SUPPLIERS DOMAIN ---
        if (domain === 'suppliers') {
            if (method === 'GET') {
                if (id) {
                    const data = await suppliersRepository.findById(id);
                    return data ? new Response(JSON.stringify(data), { status: 200 }) : new Response('Not found', { status: 404 });
                } else {
                    const data = await suppliersRepository.findAll();
                    return new Response(JSON.stringify(data), { status: 200 });
                }
            }
            if (method === 'POST') {
                const data = await suppliersRepository.create(body);
                return new Response(JSON.stringify(data), { status: 201 });
            }
            if (method === 'PUT' && id) {
                const data = await suppliersRepository.update(id, body);
                return data ? new Response(JSON.stringify(data), { status: 200 }) : new Response('Not found', { status: 404 });
            }
            if (method === 'DELETE' && id) {
                const success = await suppliersRepository.delete(id);
                return success ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 });
            }
        }

        // --- EMPENHOS DOMAIN ---
        if (domain === 'empenhos') {
            if (id === 'metrics' && method === 'GET') {
                const metrics = await empenhosRepository.getMetrics();
                return new Response(JSON.stringify(metrics), { status: 200 });
            }

            if (id === 'total' && method === 'GET') {
                const contractId = searchParams.get('contractId');
                if (contractId) {
                    const total = await empenhosRepository.totalByContract(contractId);
                    return new Response(JSON.stringify({ total }), { status: 200 });
                }
                return new Response('ContractId required', { status: 400 });
            }

            if (method === 'GET') {
                const contractId = searchParams.get('contractId');
                if (contractId) {
                    const data = await empenhosRepository.listByContract(contractId);
                    return new Response(JSON.stringify(data), { status: 200 });
                } else {
                    const data = await empenhosRepository.list();
                    return new Response(JSON.stringify(data), { status: 200 });
                }
            }
        }

        return new Response('Not found', { status: 404 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

/**
 * Real HttpClient wrapper
 * It intercepts specific /api/* routes. Otherwise, uses real window.fetch
 */
export const httpClient = async (url: string, options?: RequestInit) => {
    if (url.startsWith('/api/')) {
        // Return parsed JSON from our mock fetch
        const response = await mockFetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        if (response.status === 204) return null;
        return response.json();
    }

    // Forward to real fetch if connecting to a real backend outside /api/
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return res.json();
};
