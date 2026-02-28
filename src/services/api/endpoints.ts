export const ENDPOINTS = {
    contracts: {
        list: '/api/contracts',
        detail: (id: string) => `/api/contracts/${id}`,
        create: '/api/contracts',
        update: (id: string) => `/api/contracts/${id}`,
        delete: (id: string) => `/api/contracts/${id}`,
        metrics: '/api/contracts/metrics'
    },
    suppliers: {
        list: '/api/suppliers',
        detail: (id: string) => `/api/suppliers/${id}`,
        create: '/api/suppliers',
        update: (id: string) => `/api/suppliers/${id}`,
        delete: (id: string) => `/api/suppliers/${id}`
    },
    empenhos: {
        list: '/api/empenhos',
        listByContract: (contractId: string) => `/api/empenhos?contractId=${contractId}`,
        metrics: '/api/empenhos/metrics',
        totalByContract: (contractId: string) => `/api/empenhos/total?contractId=${contractId}`
    }
};
