import { supabase } from '../../lib/supabase';

const TENANT_ID = '6e9e8e54-c9ec-42cf-a2a2-6f5e0ae8d832';
const SELECT_FIELDS = 'id, code, full_name, birth_date, sex, cpf, rg, cns, phone, mobile, is_active';
const FULL_SELECT_FIELDS = 'id, code, full_name, birth_date, sex, cpf, rg, cns, phone, mobile, street, number, complement, district, city, state, zip_code, mother_name, father_name, notes, is_active';


export const laboratorioPacientesService = {
    estimarProximoCodigo: async () => {
        try {
            // Usa cast para inteiro na order e exclui PAC- ou nulos usando regex simples de números
            // Como Supabase (PostgREST) não suporta regex complexo nativo na URL com facilidade, 
            // podemos buscar os últimos baseados em ordem lexicográfica inversa para 'code' e ignorar PAC-.
            // A melhor forma sem criar RPC é trazer alguns e filtrar.
            const { data, error } = await supabase
                .from('lab_patients')
                .select('code')
                .eq('tenant_id', TENANT_ID)
                .not('code', 'is', null)
                .not('code', 'like', 'PAC-%')
                .order('code', { ascending: false })
                .limit(10);
                
            if (error) {
                console.warn('Erro ao estimar código:', error);
                return '115000'; // Fallback base
            }

            if (data && data.length > 0) {
                // Filtra apenas os que são totalmente numéricos e converte para número
                const validos = data
                    .map(d => parseInt(d.code, 10))
                    .filter(n => !isNaN(n) && n >= 115000);
                
                if (validos.length > 0) {
                    const max = Math.max(...validos);
                    return String(max + 1);
                }
            }
            
            return '115000';
        } catch (error) {
            console.warn('Erro interno ao estimar código:', error);
            return '115000';
        }
    },

    buscarPacientes: async ({ termo = '', status = 'Ativos', pagina = 1, porPagina = 15, ordenacao = 'Nome — A a Z' }) => {
        try {
            let query = supabase
                .from('lab_patients')
                .select(SELECT_FIELDS, { count: 'exact' })
                .eq('tenant_id', TENANT_ID);

            // Filter by status
            if (status === 'Ativos') {
                query = query.eq('is_active', true);
            } else if (status === 'Inativos') {
                query = query.eq('is_active', false);
            }

            // Search by term
            if (termo && termo.trim() !== '') {
                const sanitizedTerm = termo.trim().replace(/[,()"\\%_]/g, ' ');
                const sanitizedDoc = sanitizedTerm.replace(/\D/g, ''); // Only numbers for docs

                let orConditions = [];

                if (sanitizedTerm) {
                    orConditions.push(`full_name.ilike.%${sanitizedTerm}%`);
                    orConditions.push(`code.ilike.%${sanitizedTerm}%`);
                    orConditions.push(`cpf.ilike.%${sanitizedTerm}%`);
                    orConditions.push(`rg.ilike.%${sanitizedTerm}%`);
                    orConditions.push(`cns.ilike.%${sanitizedTerm}%`);
                }

                if (sanitizedDoc && sanitizedDoc !== sanitizedTerm) {
                    orConditions.push(`cpf.ilike.%${sanitizedDoc}%`);
                    orConditions.push(`rg.ilike.%${sanitizedDoc}%`);
                    orConditions.push(`cns.ilike.%${sanitizedDoc}%`);
                }

                if (orConditions.length > 0) {
                    query = query.or(orConditions.join(','));
                }
            }

            // Sorting
            if (ordenacao === 'Nome — Z a A') {
                query = query.order('full_name', { ascending: false });
            } else {
                query = query.order('full_name', { ascending: true });
            }

            // Pagination
            const start = (pagina - 1) * porPagina;
            const end = start + porPagina - 1;
            query = query.range(start, end);

            const { data, error, count } = await query;

            if (error) {
                console.error('Erro Supabase ao buscar pacientes:', error);
                throw error;
            }

            return {
                pacientes: data || [],
                total: count || 0,
                paginaAtual: pagina,
                totalPaginas: Math.ceil((count || 0) / porPagina)
            };
        } catch (error) {
            console.error('Erro no service buscarPacientes:', error);
            throw error;
        }
    },

    buscarPacientePorId: async (id) => {
        try {
            const { data, error } = await supabase
                .from('lab_patients')
                .select(FULL_SELECT_FIELDS)
                .eq('tenant_id', TENANT_ID)
                .eq('id', id)
                .single();

            if (error) {
                console.error('Erro ao buscar paciente por ID:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro no service buscarPacientePorId:', error);
            throw error;
        }
    },

    verificarDuplicidadePaciente: async (dados, pacienteIdAtual = null, dadosOriginais = null) => {
        try {
            const cpf = dados.cpf?.trim();
            const cns = dados.cns?.trim();
            const rg = dados.rg?.trim();

            const origCpf = dadosOriginais?.cpf?.trim();
            const origCns = dadosOriginais?.cns?.trim();
            const origRg = dadosOriginais?.rg?.trim();

            let result = {
                duplicadoForte: false,
                alerta: false,
                pacienteExistente: null,
                motivo: ''
            };

            let orConditions = [];
            
            // Somente inclui na query se for preenchido E for diferente do valor original (na edição)
            if (cpf && cpf !== origCpf) orConditions.push(`cpf.eq.${cpf}`);
            if (cns && cns !== origCns) orConditions.push(`cns.eq.${cns}`);
            if (rg && rg !== origRg) orConditions.push(`rg.eq.${rg}`);
            
            // Se nenhum documento for informado ou se nenhum foi alterado, pula a validação
            if (orConditions.length === 0) return result;

            let query = supabase
                .from('lab_patients')
                .select('id, cpf, cns, rg')
                .eq('tenant_id', TENANT_ID)
                .or(orConditions.join(','));

            if (pacienteIdAtual) {
                query = query.neq('id', pacienteIdAtual);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data && data.length > 0) {
                let dupCpf = false;
                let dupCns = false;
                let dupRg = false;

                data.forEach(p => {
                    if (cpf && p.cpf === cpf) dupCpf = true;
                    if (cns && p.cns === cns) dupCns = true;
                    if (rg && p.rg === rg) dupRg = true;
                });

                if (dupCpf || dupCns || dupRg) {
                    result.alerta = true;
                    
                    const formatCpfMsg = (c) => c ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
                    const formatCnsMsg = (c) => c ? c.replace(/^(\d{3})(\d{1,4})?(\d{1,4})?(\d{1,4})?/, (m, p1, p2, p3, p4) => [p1, p2, p3, p4].filter(Boolean).join(' ')) : '';
                    
                    let msgs = [];
                    if (dupRg) msgs.push(`- RG: ${rg}`);
                    if (dupCns) msgs.push(`- CNS: ${formatCnsMsg(cns)}`);
                    if (dupCpf) msgs.push(`- CPF: ${formatCpfMsg(cpf)}`);

                    result.motivo = `Foram encontrados documentos já utilizados por outro paciente:\n${msgs.join('\n')}\n\nDeseja revisar os dados antes de continuar?`;
                }
            }

            return result;
        } catch (error) {
            console.error('Erro no service verificarDuplicidadePaciente:', error);
            throw error;
        }
    },

    criarPaciente: async (dados) => {
        try {
            // Montar payload limpo de forma explícita (sem 'code', banco assumirá o DEFAULT sequence)
            const payload = {
                tenant_id: TENANT_ID,
                full_name: dados.full_name?.trim(),
                birth_date: dados.birth_date,
                sex: dados.sex,
                cpf: dados.cpf || null,
                rg: dados.rg || null,
                cns: dados.cns || null,
                phone: dados.phone || null,
                mobile: dados.mobile || null,
                mother_name: dados.mother_name || null,
                father_name: dados.father_name || null,
                street: dados.street || null,
                number: dados.number || null,
                complement: dados.complement || null,
                district: dados.district || null,
                city: dados.city || null,
                state: dados.state || null,
                zip_code: dados.zip_code || null,
                notes: dados.notes || null,
                is_active: dados.is_active !== undefined ? dados.is_active : true,
            };

            const { data, error } = await supabase
                .from('lab_patients')
                .insert([payload])
                .select(FULL_SELECT_FIELDS)
                .single();

            if (error) {
                console.error('Erro ao criar paciente:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro no service criarPaciente:', error);
            throw error;
        }
    },

    atualizarPaciente: async (id, dados) => {
        try {
            if (!id) throw new Error("ID do paciente é obrigatório para atualização.");

            // Montar payload limpo de forma explícita (sem enviar tenant_id e code)
            const payload = {
                full_name: dados.full_name?.trim(),
                birth_date: dados.birth_date,
                sex: dados.sex,
                cpf: dados.cpf || null,
                rg: dados.rg || null,
                cns: dados.cns || null,
                phone: dados.phone || null,
                mobile: dados.mobile || null,
                mother_name: dados.mother_name || null,
                father_name: dados.father_name || null,
                street: dados.street || null,
                number: dados.number || null,
                complement: dados.complement || null,
                district: dados.district || null,
                city: dados.city || null,
                state: dados.state || null,
                zip_code: dados.zip_code || null,
                notes: dados.notes || null,
                is_active: dados.is_active !== undefined ? dados.is_active : true,
            };

            const { data, error } = await supabase
                .from('lab_patients')
                .update(payload)
                .eq('tenant_id', TENANT_ID)
                .eq('id', id)
                .select(FULL_SELECT_FIELDS)
                .single();

            if (error) {
                console.error('Erro ao atualizar paciente:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro no service atualizarPaciente:', error);
            throw error;
        }
    }
};
