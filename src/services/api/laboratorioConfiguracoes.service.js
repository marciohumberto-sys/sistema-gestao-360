import { supabase } from '../../lib/supabase';
import { fetchLaboratorioUsers } from '../laboratorioUsers.service';

export const getCurrentTenantId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Usuário não autenticado");

    const { data } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();
        
    if (!data) throw new Error("Tenant local não encontrado");
    return data.tenant_id;
};

export const laboratorioConfiguracoesService = {
    // CARDS DO DASHBOARD
    getDashboardCards: async () => {
        try {
            const tenantId = await getCurrentTenantId();
            
            // Exames ativos
            const { count: examesCount, error: err1 } = await supabase
                .from('lab_exams')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('is_active', true);
            if (err1) throw err1;

            // Setores ativos
            const { count: setoresCount, error: err2 } = await supabase
                .from('lab_exam_sectors')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('is_active', true);
            if (err2) throw err2;

            // Parâmetros ativos
            const { count: paramsCount, error: err3 } = await supabase
                .from('lab_exam_parameters')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('is_active', true);
            if (err3) throw err3;

            // Usuários
            const users = await fetchLaboratorioUsers(tenantId);
            const usersCount = users.length;

            return {
                examesAtivos: examesCount || 0,
                setoresAtivos: setoresCount || 0,
                parametrosAtivos: paramsCount || 0,
                usuariosVinculados: usersCount || 0
            };
        } catch (error) {
            console.error('Erro ao buscar cards do laboratório:', error);
            throw error;
        }
    },

    // LISTAR EXAMES
    getExames: async (filters = {}) => {
        try {
            const tenantId = await getCurrentTenantId();
            
            let query = supabase
                .from('lab_exams')
                .select(`
                    id, tenant_id, code, name, sector_id, material, method, result_type, 
                    unit, requires_conference, prints_on_report, print_order, is_active, 
                    analyzer_name, created_at, updated_at,
                    lab_exam_sectors ( id, name )
                `)
                .eq('tenant_id', tenantId);

            if (filters.search && filters.search.trim() !== '') {
                const searchLower = filters.search.trim().toLowerCase();
                query = query.or(`name.ilike.%${searchLower}%,code.ilike.%${searchLower}%`);
            }
            if (filters.sector_id && filters.sector_id !== 'todos') {
                query = query.eq('sector_id', filters.sector_id);
            }
            if (filters.status && filters.status !== 'todos') {
                query = query.eq('is_active', filters.status === 'ativos');
            }

            query = query.order('name', { ascending: true });

            const { data, error } = await query;
            
            if (error) throw error;

            return data.map(item => ({
                ...item,
                sector_name: item.lab_exam_sectors?.name || 'Não informado'
            }));
        } catch (error) {
            console.error('Erro ao listar exames:', error);
            throw error;
        }
    },

    // LISTAR SETORES PARA O FILTRO
    getSetoresAtivos: async () => {
        try {
            const tenantId = await getCurrentTenantId();
            const { data, error } = await supabase
                .from('lab_exam_sectors')
                .select('id, name')
                .eq('tenant_id', tenantId)
                .eq('is_active', true)
                .order('name');
                
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar setores ativos:', error);
            throw error;
        }
    },

    // ATIVAR / INATIVAR EXAME
    toggleExamStatus: async (examId, isActive) => {
        try {
            const tenantId = await getCurrentTenantId();
            const { data, error } = await supabase
                .from('lab_exams')
                .update({ 
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                })
                .eq('id', examId)
                .eq('tenant_id', tenantId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao alterar status do exame:', error);
            throw error;
        }
    },

    // VALORES DISTINTOS
    getDistinctValues: async (column) => {
        const ALLOWED_DISTINCT_COLUMNS = ['material', 'method', 'unit', 'analyzer_name'];
        if (!ALLOWED_DISTINCT_COLUMNS.includes(column)) {
            throw new Error(`Coluna não permitida para distinct values: ${column}`);
        }

        try {
            const tenantId = await getCurrentTenantId();
            
            // Busca na tabela principal
            const { data, error } = await supabase
                .from('lab_exams')
                .select(column)
                .eq('tenant_id', tenantId);

            if (error) throw error;

            let allData = [...data];

            // Para 'unit', buscar também em lab_exam_parameters
            if (column === 'unit') {
                const { data: paramData, error: paramError } = await supabase
                    .from('lab_exam_parameters')
                    .select('unit')
                    .eq('tenant_id', tenantId)
                    .eq('is_active', true);
                    
                if (!paramError && paramData) {
                    allData = [...allData, ...paramData];
                }
            }

            const values = allData
                .map(item => item[column])
                .filter(val => val !== null && val !== undefined && val.trim() !== '')
                .map(val => val.trim());

            // Remove duplicados case-insensitive e sem acentos, mantendo a primeira forma visual
            const distinctMap = new Map();
            for (const val of values) {
                const normalized = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                if (!distinctMap.has(normalized)) {
                    distinctMap.set(normalized, val);
                }
            }

            return Array.from(distinctMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        } catch (error) {
            console.error(`Erro ao buscar valores distintos para ${column}:`, error);
            throw error;
        }
    },

    // VERIFICAR DUPLICIDADE
    checkExamCodeExists: async (code, currentExamId = null) => {
        try {
            const tenantId = await getCurrentTenantId();
            const normalizedCode = (code || '').trim().toUpperCase();
            
            let query = supabase
                .from('lab_exams')
                .select('id')
                .eq('tenant_id', tenantId)
                .ilike('code', normalizedCode);
                
            if (currentExamId) {
                query = query.neq('id', currentExamId);
            }
            
            const { data, error } = await query.limit(1);
            if (error) throw error;
            
            return data.length > 0;
        } catch (error) {
            console.error('Erro ao verificar duplicidade de código:', error);
            throw error;
        }
    },

    // CRIAR EXAME
    createExam: async (examData) => {
        try {
            const tenantId = await getCurrentTenantId();
            const { data, error } = await supabase
                .from('lab_exams')
                .insert([{ ...examData, tenant_id: tenantId }])
                .select()
                .single();
                
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar exame:', error);
            throw error;
        }
    },

    // ATUALIZAR EXAME
    updateExam: async (examId, examData) => {
        try {
            const tenantId = await getCurrentTenantId();
            
            const { data, error } = await supabase
                .from('lab_exams')
                .update({ 
                    ...examData, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', examId)
                .eq('tenant_id', tenantId)
                .select()
                .single();
                
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao atualizar exame:', error);
            throw error;
        }
    },

    // ----------------------------------------------------
    // PARÂMETROS E REFERÊNCIAS
    // ----------------------------------------------------

    getParametros: async (filters = {}, page = 1, pageSize = 20) => {
        try {
            const tenantId = await getCurrentTenantId();
            const start = (page - 1) * pageSize;
            const end = start + pageSize - 1;

            let query = supabase
                .from('lab_exam_parameters')
                .select(`
                    *,
                    lab_exams ( id, code, name, sector_id, result_type, material, method )
                `, { count: 'exact' })
                .eq('tenant_id', tenantId);

            if (filters.search && filters.search.trim() !== '') {
                const searchLower = filters.search.trim().toLowerCase();
                
                // Busca no exame vinculado
                const { data: examesMatch } = await supabase
                    .from('lab_exams')
                    .select('id')
                    .or(`name.ilike.%${searchLower}%,code.ilike.%${searchLower}%`)
                    .eq('tenant_id', tenantId);
                
                const examIds = examesMatch ? examesMatch.map(e => e.id) : [];
                
                if (examIds.length > 0) {
                    query = query.or(`name.ilike.%${searchLower}%,code.ilike.%${searchLower}%,exam_id.in.(${examIds.join(',')})`);
                } else {
                    query = query.or(`name.ilike.%${searchLower}%,code.ilike.%${searchLower}%`);
                }
            }
            if (filters.exam_id && filters.exam_id !== 'todos') {
                query = query.eq('exam_id', filters.exam_id);
            }
            if (filters.status && filters.status !== 'todos') {
                query = query.eq('is_active', filters.status === 'ativos');
            }

            // Ordenação: priorizar ordem lógica de visualização
            query = query
                .order('exam_id', { ascending: true })
                .order('display_order', { ascending: true })
                .order('code', { ascending: true })
                .range(start, end);

            const { data, count, error } = await query;
            if (error) throw error;

            return {
                data: data.map(item => ({
                    ...item,
                    exam_code: item.lab_exams?.code || '',
                    exam_name: item.lab_exams?.name || '',
                    exam_material: item.lab_exams?.material || '',
                    exam_method: item.lab_exams?.method || ''
                })),
                total: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize)
            };
        } catch (error) {
            console.error('Erro ao listar parâmetros:', error);
            throw error;
        }
    },

    checkParamCodeExists: async (examId, code, currentParamId = null) => {
        try {
            const tenantId = await getCurrentTenantId();
            const normalizedCode = (code || '').trim().toUpperCase();

            // Validação de igualdade exata (sem ilike)
            let query = supabase
                .from('lab_exam_parameters')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('exam_id', examId)
                .eq('code', normalizedCode);

            if (currentParamId) {
                query = query.neq('id', currentParamId);
            }

            const { data, error } = await query.limit(1);
            if (error) throw error;

            return data.length > 0;
        } catch (error) {
            console.error('Erro ao verificar duplicidade de código do parâmetro:', error);
            throw error;
        }
    },

    checkParamOrderExists: async (examId, order, currentParamId = null) => {
        try {
            const tenantId = await getCurrentTenantId();
            
            let query = supabase
                .from('lab_exam_parameters')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('exam_id', examId)
                .eq('display_order', order);

            if (currentParamId) {
                query = query.neq('id', currentParamId);
            }

            const { data, error } = await query.limit(1);
            if (error) throw error;

            return data.length > 0;
        } catch (error) {
            console.error('Erro ao verificar ordem duplicada do parâmetro:', error);
            throw error;
        }
    },

    hasParameterHistory: async (paramId) => {
        try {
            const tenantId = await getCurrentTenantId();
            const { count, error } = await supabase
                .from('lab_result_values')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('parameter_id', paramId);
                
            if (error) throw error;
            return count > 0;
        } catch (error) {
            console.error('Erro ao verificar histórico do parâmetro:', error);
            throw error;
        }
    },

    toggleParamStatus: async (paramId, isActive) => {
        try {
            const tenantId = await getCurrentTenantId();
            const { data, error } = await supabase
                .from('lab_exam_parameters')
                .update({ 
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                })
                .eq('id', paramId)
                .eq('tenant_id', tenantId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao alterar status do parâmetro:', error);
            throw error;
        }
    },

    createParameter: async (paramData) => {
        try {
            const tenantId = await getCurrentTenantId();
            const { data, error } = await supabase
                .from('lab_exam_parameters')
                .insert([{ ...paramData, tenant_id: tenantId }])
                .select()
                .single();
                
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar parâmetro:', error);
            throw error;
        }
    },

    updateParameter: async (paramId, paramData) => {
        try {
            const tenantId = await getCurrentTenantId();
            
            // Revalidar bloqueio de result_type no backend
            const hasHistory = await laboratorioConfiguracoesService.hasParameterHistory(paramId);
            
            // Buscar parâmetro atual para comparação se tem histórico
            let payload = { ...paramData, updated_at: new Date().toISOString() };
            
            if (hasHistory) {
                const { data: currentParam, error: currentErr } = await supabase
                    .from('lab_exam_parameters')
                    .select('result_type')
                    .eq('id', paramId)
                    .eq('tenant_id', tenantId)
                    .single();
                    
                if (currentErr) throw currentErr;
                
                // Se tentaram mudar o tipo, bloqueia e lança erro seguro
                if (payload.result_type && payload.result_type !== currentParam.result_type) {
                    throw new Error("OPERATION_BLOCKED: Parâmetro possui histórico e o tipo de resultado não pode ser modificado.");
                }
                
                // Remove do payload para não sobrescrever acidentalmente com outro formato
                delete payload.result_type;
            }
            
            const { data, error } = await supabase
                .from('lab_exam_parameters')
                .update(payload)
                .eq('id', paramId)
                .eq('tenant_id', tenantId)
                .select()
                .single();
                
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao atualizar parâmetro:', error);
            throw error;
        }
    },

    async getSectors(filters = {}) {
        try {
            const tenantId = await getCurrentTenantId();
            let query = supabase
                .from('lab_exam_sectors')
                .select('*')
                .eq('tenant_id', tenantId);

            if (filters.status && filters.status !== 'todos') {
                query = query.eq('is_active', filters.status === 'ativos');
            }

            if (filters.search && filters.search.trim() !== '') {
                const searchLower = filters.search.trim().toLowerCase();
                query = query.or(`name.ilike.%${searchLower}%,code.ilike.%${searchLower}%`);
            }

            // Ordenar por print_order (nulls last) e depois por name
            query = query.order('print_order', { ascending: true, nullsFirst: false }).order('name', { ascending: true });

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar setores:', error);
            throw error;
        }
    },

    async checkSectorCodeExists(code, currentSectorId = null) {
        try {
            const tenantId = await getCurrentTenantId();
            let query = supabase
                .from('lab_exam_sectors')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('code', code.trim().toUpperCase());

            if (currentSectorId) {
                query = query.neq('id', currentSectorId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data.length > 0;
        } catch (error) {
            console.error('Erro ao verificar código do setor:', error);
            throw error;
        }
    },

    async createSector(sectorData) {
        try {
            const tenantId = await getCurrentTenantId();
            const payload = {
                ...sectorData,
                tenant_id: tenantId,
                code: sectorData.code.trim().toUpperCase(),
                name: sectorData.name.trim(),
                description: sectorData.description ? sectorData.description.trim() : null
            };

            const { data, error } = await supabase
                .from('lab_exam_sectors')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar setor:', error);
            throw error;
        }
    },

    async updateSector(id, sectorData) {
        try {
            const payload = {
                ...sectorData,
                code: sectorData.code.trim().toUpperCase(),
                name: sectorData.name.trim(),
                description: sectorData.description ? sectorData.description.trim() : null,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('lab_exam_sectors')
                .update(payload)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao atualizar setor:', error);
            throw error;
        }
    },

    async toggleSectorStatus(id, isActive) {
        try {
            const { data, error } = await supabase
                .from('lab_exam_sectors')
                .update({ 
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao alternar status do setor:', error);
            throw error;
        }
    },

    async getSectorExamCount(sectorId) {
        try {
            const tenantId = await getCurrentTenantId();
            const { count, error } = await supabase
                .from('lab_exams')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('sector_id', sectorId);

            if (error) throw error;
            return count;
        } catch (error) {
            console.error('Erro ao buscar contagem de exames do setor:', error);
            throw error;
        }
    },
};
