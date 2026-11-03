import { supabase } from '../../lib/supabase';

class LaboratorioMapasService {
    
    // Lista os lotes gerados para o tenant
    async listarLotes(tenantId) {
        try {
            if (!tenantId) throw new Error("Tenant não identificado.");
            
            const { data, error } = await supabase
                .from('lab_map_batches')
                .select('id, tenant_id, status, generated_at, reference_date, sector_id, start_patient_code, end_patient_code, lab_exam_sectors(name)')
                .eq('tenant_id', tenantId)
                .order('generated_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            const batches = data || [];
            
            if (batches.length > 0) {
                const batchIds = batches.map(b => b.id);
                
                // Buscar agregados dos itens para enriquecer o resumo sem N+1
                const { data: items, error: itemsErr } = await supabase
                    .from('lab_map_batch_items')
                    .select('batch_id, lab_attendance_exams!inner(attendance_id)')
                    .in('batch_id', batchIds);
                    
                if (!itemsErr && items) {
                    const countsByBatch = {};
                    for (const item of items) {
                        if (!countsByBatch[item.batch_id]) {
                            countsByBatch[item.batch_id] = { exams: 0, patientsSet: new Set() };
                        }
                        countsByBatch[item.batch_id].exams++;
                        if (item.lab_attendance_exams?.attendance_id) {
                            countsByBatch[item.batch_id].patientsSet.add(item.lab_attendance_exams.attendance_id);
                        }
                    }
                    
                    for (const b of batches) {
                        const cb = countsByBatch[b.id];
                        b.patient_count = cb ? cb.patientsSet.size : 0;
                        b.exam_count = cb ? cb.exams : 0;
                        b.sector_name = b.lab_exam_sectors?.name || 'Setor';
                    }
                } else {
                    for (const b of batches) {
                        b.patient_count = 0;
                        b.exam_count = 0;
                        b.sector_name = b.lab_exam_sectors?.name || 'Setor';
                    }
                }
            }

            return batches;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao listar lotes:', error);
            throw error;
        }
    }

    // Busca as observações do atendimento (lab_attendances.observations) para os pacientes do lote
    async buscarObservacoesDoLote(tenantId, loteId, snapshot, referenceDateFallback = null) {
        try {
            if (!tenantId || !snapshot) return { byAttendanceId: {}, byPatientId: {}, byCode: {} };
            const snap = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
            const patients = Array.isArray(snap?.patients) ? snap.patients : [];
            if (patients.length === 0) return { byAttendanceId: {}, byPatientId: {}, byCode: {} };

            const codes = [...new Set(patients.map(p => (p?.code ? String(p.code).trim() : '')).filter(Boolean))];
            const snapPatientIds = [...new Set(patients.map(p => p?.patient_id).filter(Boolean))];
            const snapAttendanceIds = [...new Set(patients.map(p => p?.attendance_id).filter(Boolean))];
            const refDate = snap?.metadata?.reference_date || referenceDateFallback || null;

            const codeByPatientId = {};
            const patientIdByCode = {};

            for (const p of patients) {
                const c = p?.code ? String(p.code).trim() : '';
                if (p?.patient_id && c) {
                    codeByPatientId[p.patient_id] = c;
                    patientIdByCode[c] = p.patient_id;
                }
            }

            if (codes.length > 0) {
                const { data: patRows, error: patErr } = await supabase
                    .from('lab_patients')
                    .select('id, code')
                    .eq('tenant_id', tenantId)
                    .in('code', codes);

                if (!patErr && patRows) {
                    for (const row of patRows) {
                        const c = row.code ? String(row.code).trim() : '';
                        if (row.id && c) {
                            codeByPatientId[row.id] = c;
                            patientIdByCode[c] = row.id;
                        }
                    }
                }
            }

            const allPatientIds = [...new Set([...snapPatientIds, ...Object.values(patientIdByCode)].filter(Boolean))];

            // 1. Buscar attendance_ids vinculados aos itens do lote em lab_map_batch_items
            let batchAttendanceIds = [...snapAttendanceIds];
            if (loteId && loteId !== 'VIRTUAL' && loteId !== 'CONSOLIDADO') {
                const { data: items, error: itemsErr } = await supabase
                    .from('lab_map_batch_items')
                    .select('batch_id, lab_attendance_exams!inner(attendance_id)')
                    .eq('batch_id', loteId);

                if (!itemsErr && items) {
                    for (const item of items) {
                        const attId = item.lab_attendance_exams?.attendance_id;
                        if (attId) batchAttendanceIds.push(attId);
                    }
                }
            }
            batchAttendanceIds = [...new Set(batchAttendanceIds.filter(Boolean))];

            const byAttendanceId = {};
            const byPatientIdList = {};
            const byCodeList = {};

            const addObs = (att) => {
                if (!att) return;
                const obs = typeof att.observations === 'string' ? att.observations.trim() : '';
                if (!obs) return;

                if (att.id && !byAttendanceId[att.id]) {
                    byAttendanceId[att.id] = obs;
                }
                const pId = att.patient_id;
                if (pId) {
                    if (!byPatientIdList[pId]) byPatientIdList[pId] = [];
                    if (!byPatientIdList[pId].includes(obs)) {
                        byPatientIdList[pId].push(obs);
                    }
                }
                const code = pId ? codeByPatientId[pId] : null;
                if (code) {
                    if (!byCodeList[code]) byCodeList[code] = [];
                    if (!byCodeList[code].includes(obs)) {
                        byCodeList[code].push(obs);
                    }
                }
            };

            if (batchAttendanceIds.length > 0) {
                const { data: attRows, error: attErr } = await supabase
                    .from('lab_attendances')
                    .select('id, patient_id, attendance_date, observations, created_at')
                    .eq('tenant_id', tenantId)
                    .in('id', batchAttendanceIds)
                    .order('created_at', { ascending: true });

                if (!attErr && attRows) {
                    for (const att of attRows) {
                        addObs(att);
                    }
                }
            }

            // 2. Fallback por patient_id + data de referência do mapa
            if (allPatientIds.length > 0 && refDate) {
                const missingPatientIds = allPatientIds.filter(id => !byPatientIdList[id]);
                if (missingPatientIds.length > 0) {
                    const { data: dateAttRows, error: dateAttErr } = await supabase
                        .from('lab_attendances')
                        .select('id, patient_id, attendance_date, observations, created_at')
                        .eq('tenant_id', tenantId)
                        .eq('attendance_date', refDate)
                        .in('patient_id', missingPatientIds)
                        .order('created_at', { ascending: true });

                    if (!dateAttErr && dateAttRows) {
                        for (const att of dateAttRows) {
                            addObs(att);
                        }
                    }
                }
            }

            const byPatientId = {};
            for (const [k, list] of Object.entries(byPatientIdList)) {
                byPatientId[k] = list.join(' / ');
            }

            const byCode = {};
            for (const [k, list] of Object.entries(byCodeList)) {
                byCode[k] = list.join(' / ');
            }

            return { byAttendanceId, byPatientId, byCode };
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao buscar observações do atendimento:', error);
            return { byAttendanceId: {}, byPatientId: {}, byCode: {} };
        }
    }

    async enriquecerSnapshotComObservacoes(tenantId, loteId, rawSnapshot, referenceDateFallback = null) {
        if (!rawSnapshot) return rawSnapshot;
        try {
            const isString = typeof rawSnapshot === 'string';
            const snap = isString ? JSON.parse(rawSnapshot) : rawSnapshot;
            if (!snap || !Array.isArray(snap.patients) || snap.patients.length === 0) {
                return rawSnapshot;
            }

            const { byAttendanceId, byPatientId, byCode } = await this.buscarObservacoesDoLote(
                tenantId,
                loteId,
                snap,
                referenceDateFallback
            );

            const enrichedPatients = snap.patients.map(pat => {
                const lookupCode = pat?.code ? String(pat.code).trim() : '';
                const candidates = [
                    pat?.attendance_id ? byAttendanceId[pat.attendance_id] : null,
                    pat?.patient_id ? byPatientId[pat.patient_id] : null,
                    lookupCode ? byCode[lookupCode] : null,
                    pat?.observations,
                    pat?.observation,
                    pat?.obs,
                    pat?.observacao
                ];
                let resolvedObs = '';
                for (const c of candidates) {
                    if (typeof c === 'string' && c.trim() !== '') {
                        resolvedObs = c.trim();
                        break;
                    }
                }
                return {
                    ...pat,
                    observations: resolvedObs || null
                };
            });

            const enrichedSnap = {
                ...snap,
                patients: enrichedPatients
            };

            return isString ? JSON.stringify(enrichedSnap) : enrichedSnap;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao enriquecer snapshot com observações:', error);
            return rawSnapshot;
        }
    }

    // Busca detalhes completos de um lote (inclui document_snapshot pesado)
    async buscarDetalhesLote(tenantId, loteId) {
        try {
            if (!tenantId || !loteId) return null;
            const { data, error } = await supabase
                .from('lab_map_batches')
                .select('document_snapshot, reference_date')
                .eq('tenant_id', tenantId)
                .eq('id', loteId)
                .single();
            if (error) throw error;
            if (data && data.document_snapshot) {
                data.document_snapshot = await this.enriquecerSnapshotComObservacoes(
                    tenantId,
                    loteId,
                    data.document_snapshot,
                    data.reference_date
                );
            }
            return data;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao buscar detalhes do lote:', error);
            throw error;
        }
    }

    // Carrega totalizadores usando count no banco
    async carregarEstatisticas(tenantId) {
        try {
            if (!tenantId) return { pendentes: 0, impressos: 0, pacientes: 0, exames: 0 };
            
            const [pendentesReq, impressosReq, pacientesReq, examesReq] = await Promise.all([
                supabase.from('lab_map_batches').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'PENDING'),
                supabase.from('lab_map_batches').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'PRINTED'),
                // O card "Pacientes" historicamente contava Atendimentos impressos em mapas. Aproximamos usando lab_attendances.
                supabase.from('lab_attendances').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
                // O card "Exames" contava os exames contidos nos mapas. Usamos lab_map_batch_items.
                supabase.from('lab_map_batch_items').select('*', { count: 'exact', head: true })
            ]);
            
            return {
                pendentes: pendentesReq.count || 0,
                impressos: impressosReq.count || 0,
                pacientes: pacientesReq.count || 0,
                exames: examesReq.count || 0
            };
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao carregar estatísticas:', error);
            return { pendentes: 0, impressos: 0, pacientes: 0, exames: 0 };
        }
    }

    // Chama a RPC de geração do lote coletivo
    async gerarLoteColetivo({ tenantId, referenceDate, sectorId, startCode, endCode }) {
        try {
            if (!tenantId) throw new Error("Tenant não identificado.");

            const { data, error } = await supabase.rpc('rpc_lab_generate_map_batch', {
                p_tenant_id: tenantId,
                p_reference_date: referenceDate,
                p_sector_id: sectorId,
                p_start_code: startCode,
                p_end_code: endCode
            });

            if (error) throw error;
            if (data?.batch?.document_snapshot) {
                data.batch.document_snapshot = await this.enriquecerSnapshotComObservacoes(
                    tenantId,
                    data.batch.id,
                    data.batch.document_snapshot,
                    data.batch.reference_date || referenceDate
                );
            }
            return data;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao gerar lote:', error);
            throw error;
        }
    }

    // Chama a RPC de geração do lote coletivo (todos os pacientes)
    async gerarLoteColetivoTodos({ tenantId, referenceDate, sectorId }) {
        try {
            if (!tenantId) throw new Error("Tenant não identificado.");

            const { data, error } = await supabase.rpc('rpc_lab_generate_all_map_batch', {
                p_tenant_id: tenantId,
                p_reference_date: referenceDate,
                p_sector_id: sectorId
            });

            if (error) throw error;
            if (data?.batch?.document_snapshot) {
                data.batch.document_snapshot = await this.enriquecerSnapshotComObservacoes(
                    tenantId,
                    data.batch.id,
                    data.batch.document_snapshot,
                    data.batch.reference_date || referenceDate
                );
            }
            return data;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao gerar lote de todos:', error);
            throw error;
        }
    }

    // Chama a RPC para marcar como impresso
    async marcarLoteComoImpresso({ tenantId, batchId }) {
        try {
            if (!tenantId || !batchId) throw new Error("Parâmetros inválidos para impressão.");

            const { data, error } = await supabase.rpc('rpc_lab_mark_map_batch_printed', {
                p_tenant_id: tenantId,
                p_batch_id: batchId
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao marcar lote como impresso:', error);
            throw error;
        }
    }

    // Chama a RPC para cancelar lote
    async cancelarLote({ tenantId, batchId }) {
        try {
            if (!tenantId || !batchId) throw new Error("Parâmetros inválidos para cancelamento.");

            const { data, error } = await supabase.rpc('rpc_lab_cancel_map_batch', {
                p_tenant_id: tenantId,
                p_batch_id: batchId
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[LaboratorioMapasService] Erro ao cancelar lote:', error);
            throw error;
        }
    }
}

export const laboratorioMapasService = new LaboratorioMapasService();
