import { supabase } from '../../lib/supabase';

class LaboratorioAtendimentoService {
    static TENANT_ID = '6e9e8e54-c9ec-42cf-a2a2-6f5e0ae8d832';

    async buscarPacientes(termo) {
        if (!termo || termo.length < 3) return [];
        
        const termoLimpo = termo.trim();
        
        console.debug('[LAB][BUSCA PACIENTE] termo', termoLimpo);

        let query = supabase
            .from('lab_patients')
            .select(`
                id,
                tenant_id,
                code,
                full_name,
                birth_date,
                sex,
                cpf,
                rg,
                cns,
                phone,
                mobile,
                mother_name,
                father_name,
                notes,
                is_active
            `)
            .eq('tenant_id', LaboratorioAtendimentoService.TENANT_ID)
            .eq('is_active', true)
            .order('full_name', { ascending: true })
            .limit(30);

        if (termoLimpo) {
            const pattern = `%${termoLimpo}%`;
            query = query.or(
                [
                    `full_name.ilike.${pattern}`,
                    `code.ilike.${pattern}`,
                    `cpf.ilike.${pattern}`,
                    `cns.ilike.${pattern}`,
                    `phone.ilike.${pattern}`,
                    `mobile.ilike.${pattern}`
                ].join(',')
            );
        }

        const { data, error } = await query;

        console.debug('[LAB][BUSCA PACIENTE] retorno service', {
            quantidade: Array.isArray(data) ? data.length : null,
            possuiErro: Boolean(error),
        });

        if (error) {
            console.error('[LaboratorioAtendimento][BuscaPaciente] Erro', {
                code: error?.code,
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
            });
            throw new Error('Não foi possível consultar os pacientes. Tente novamente.');
        }
        
        return Array.isArray(data) ? data : [];
    }

    async buscarExamesAtivos() {
        const { data, error } = await supabase
            .from('lab_exams')
            .select(`
                id, 
                code, 
                name, 
                material, 
                method, 
                sector_id,
                lab_exam_sectors ( name )
            `)
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('[LaboratorioAtendimentoService] Erro ao buscar exames:', error);
            throw error;
        }
        
        return (data || []).map(ex => ({
            ...ex,
            sector_name: ex.lab_exam_sectors?.name || 'Não inf.'
        }));
    }

    async verificarExamesAtivos(examIds) {
        if (!examIds || examIds.length === 0) return [];
        const { data, error } = await supabase
            .from('lab_exams')
            .select('id, code, name')
            .in('id', examIds)
            .eq('is_active', false);
        
        if (error) {
            console.error('Erro ao verificar exames ativos:', error);
            throw new Error('Erro ao validar status dos exames.');
        }
        return data || []; // Retorna os que estão INATIVOS
    }

    async verificarPacienteAtivo(patientId) {
        if (!patientId) return { active: false, error: new Error('ID do paciente não informado.') };
        try {
            const { data, error } = await supabase
                .from('lab_patients')
                .select('is_active')
                .eq('id', patientId)
                .single();
                
            if (error) {
                return { active: false, error: error };
            }
            if (!data) {
                return { active: false, error: new Error('Paciente não encontrado.') };
            }
            return { active: data.is_active, error: null };
        } catch (err) {
            return { active: false, error: err };
        }
    }

    async buscarParametrosPorExames(examIds) {
        if (!examIds || examIds.length === 0) return [];
        
        const { data, error } = await supabase
            .from('lab_exam_parameters')
            .select('*')
            .in('exam_id', examIds)
            .eq('is_active', true)
            .order('exam_id', { ascending: true })
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('[LaboratorioAtendimentoService] Erro ao buscar parâmetros:', error);
            throw error;
        }

        // Agrupar por exam_id
        const parametrosPorExame = (data || []).reduce((acc, param) => {
            if (!acc[param.exam_id]) acc[param.exam_id] = [];
            acc[param.exam_id].push(param);
            return acc;
        }, {});

        return parametrosPorExame;
    }

    async gerarProximoProtocolo(anoAtual) {
        const prefix = `LAB-${anoAtual}-`;
        
        const { data, error } = await supabase
            .from('lab_attendances')
            .select('protocol_number')
            .like('protocol_number', `${prefix}%`)
            .order('protocol_number', { ascending: false })
            .limit(1);
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return `${prefix}0001`;
        }
        
        const ultimoProtocolo = data[0].protocol_number;
        const partes = ultimoProtocolo.split('-');
        if (partes.length === 3) {
            const numeroAtual = parseInt(partes[2], 10);
            if (!isNaN(numeroAtual)) {
                const proximoNumero = String(numeroAtual + 1).padStart(4, '0');
                return `${prefix}${proximoNumero}`;
            }
        }
        
        return `${prefix}0001`; // fallback
    }

    async salvarAtendimentoTransacional(dadosAtendimento, examesSelecionados) {
        const anoAtual = new Date().getFullYear();
        let protocoloFinal = null;
        let attendanceId = null;
        
        const criados = {
            attendanceId: null,
            attendanceExamIds: [],
            resultIds: [],
            resultValueIds: []
        };
        
        if (!dadosAtendimento?.patient_id) {
            throw new Error('Não foi possível identificar o paciente selecionado. Selecione novamente o paciente e tente salvar.');
        }
        
        try {
            // Busca parâmetros em uma única query e valida se todos os exames têm parâmetros
            const examIds = examesSelecionados.map(e => e.id);
            const paramsAgrupados = await this.buscarParametrosPorExames(examIds);
            
            for (const exame of examesSelecionados) {
                const params = paramsAgrupados[exame.id];
                if (!params || params.length === 0) {
                    throw new Error(`O exame "${exame.code} - ${exame.name}" não possui parâmetros ativos cadastrados.`);
                }
            }

            // Geração de Protocolo com Retry
            let retries = 0;
            let successAttendance = false;
            
            while (retries < 5 && !successAttendance) {
                protocoloFinal = await this.gerarProximoProtocolo(anoAtual);
                
                const attendancePayload = {
                    tenant_id: LaboratorioAtendimentoService.TENANT_ID,
                    protocol_number: protocoloFinal,
                    patient_id: dadosAtendimento.patient_id,
                    attendance_date: dadosAtendimento.attendance_date || null,
                    attendance_time: dadosAtendimento.attendance_time || null,
                    attendance_origin: dadosAtendimento.attendance_origin,
                    requesting_doctor: dadosAtendimento.requesting_doctor || null,
                    agreement: 'SUS',
                    delivery_location: 'CENTRAL',
                    expected_delivery_date: dadosAtendimento.expected_delivery_date || null,
                    fasting: dadosAtendimento.fasting || null,
                    dum: dadosAtendimento.dum || null,
                    diagnosis: dadosAtendimento.diagnosis || null,
                    medications: dadosAtendimento.medications || null,
                    observations: dadosAtendimento.observations || null,
                    status: 'ABERTO'
                };

                const { data: attData, error: attError } = await supabase
                    .from('lab_attendances')
                    .insert([attendancePayload])
                    .select('id')
                    .single();

                if (attError) {
                    // Unique violation code
                    if (attError.code === '23505') {
                        retries++;
                        continue;
                    }
                    console.error('[Lab] Erro ao criar atendimento:', attError);
                    throw new Error('Não foi possível abrir o atendimento.');
                }
                
                attendanceId = attData.id;
                criados.attendanceId = attendanceId;
                successAttendance = true;
            }

            if (!successAttendance) {
                throw new Error("Não foi possível gerar um protocolo único após várias tentativas.");
            }

            // Cria Attendance Exams e Results
            for (const exame of examesSelecionados) {
                // 1. lab_attendance_exams
                const attExamPayload = {
                    tenant_id: LaboratorioAtendimentoService.TENANT_ID,
                    attendance_id: attendanceId,
                    exam_id: exame.id,
                    sector_id: exame.sector_id || null,
                    collection_date: dadosAtendimento.attendance_date || null, // data atual da coleta
                    collection_time: dadosAtendimento.attendance_time || null,
                    status: 'SOLICITADO',
                    observations: null
                };

                const { data: attExamData, error: attExamError } = await supabase
                    .from('lab_attendance_exams')
                    .insert([attExamPayload])
                    .select('id')
                    .single();

                if (attExamError) {
                    console.error('[Lab] Erro ao criar att_exam:', attExamError);
                    throw new Error('O atendimento foi iniciado, mas não foi possível incluir os exames.');
                }
                criados.attendanceExamIds.push(attExamData.id);

                // 2. lab_results
                const resultPayload = {
                    tenant_id: LaboratorioAtendimentoService.TENANT_ID,
                    patient_id: dadosAtendimento.patient_id,
                    attendance_id: attendanceId,
                    attendance_exam_id: attExamData.id,
                    exam_id: exame.id,
                    status: 'PENDENTE'
                };

                const { data: resultData, error: resultError } = await supabase
                    .from('lab_results')
                    .insert([resultPayload])
                    .select('id')
                    .single();

                if (resultError) {
                    console.error('[Lab] Erro ao criar result:', resultError);
                    throw new Error('O atendimento foi iniciado, mas não foi possível incluir os exames.');
                }
                criados.resultIds.push(resultData.id);

                // 3. lab_result_values
                const params = paramsAgrupados[exame.id];
                const valuesPayload = params.map(p => ({
                    tenant_id: LaboratorioAtendimentoService.TENANT_ID,
                    result_id: resultData.id,
                    exam_id: exame.id,
                    parameter_id: p.id,
                    display_order: p.display_order,
                    parameter_code: p.code,
                    parameter_name: p.name,
                    result_type: p.result_type,
                    unit: p.unit,
                    reference_text: p.reference_text,
                    min_value: p.min_value,
                    max_value: p.max_value,
                    value_text: null,
                    value_numeric: null,
                    is_abnormal: null,
                    observation: null
                }));

                const possuiPayloadInvalido = valuesPayload.some(
                    (item) => !item.tenant_id || !item.result_id || !item.exam_id || !item.parameter_id
                );

                if (possuiPayloadInvalido) {
                    throw new Error('Não foi possível preparar os campos de resultado dos exames.');
                }

                if (valuesPayload.length > 0) {
                    const { data: valuesData, error: valuesError } = await supabase
                        .from('lab_result_values')
                        .insert(valuesPayload)
                        .select('id');
                    
                    if (valuesError) {
                        console.error('[Lab] Erro values:', valuesError);
                        throw new Error('Não foi possível preparar os campos de resultado dos exames.');
                    }
                    if (valuesData) {
                        criados.resultValueIds.push(...valuesData.map(v => v.id));
                    }
                }
            }

            return { success: true, protocolo: protocoloFinal };
            
        } catch (error) {
            console.error('[LaboratorioAtendimentoService] Erro ao salvar:', error);
            
            // Fluxo de Compensação (Rollback manual)
            console.warn('[LaboratorioAtendimentoService] Iniciando compensação por falha...', criados);
            try {
                if (criados.resultValueIds.length > 0) {
                    await supabase.from('lab_result_values').delete().in('id', criados.resultValueIds);
                }
                if (criados.resultIds.length > 0) {
                    await supabase.from('lab_results').delete().in('id', criados.resultIds);
                }
                if (criados.attendanceExamIds.length > 0) {
                    await supabase.from('lab_attendance_exams').delete().in('id', criados.attendanceExamIds);
                }
                if (criados.attendanceId) {
                    await supabase.from('lab_attendances').delete().eq('id', criados.attendanceId);
                }
                console.warn('[LaboratorioAtendimentoService] Compensação finalizada com sucesso.');
            } catch (compError) {
                console.error('[LaboratorioAtendimentoService] ERRO CRÍTICO NA COMPENSAÇÃO. O atendimento pode estar em estado inconsistente no banco.', compError);
                throw new Error('O atendimento não foi concluído e requer verificação técnica.');
            }

            throw error || new Error('Não foi possível salvar o atendimento. Revise os dados e tente novamente.');
        }
    }
}

export const laboratorioAtendimentoService = new LaboratorioAtendimentoService();
