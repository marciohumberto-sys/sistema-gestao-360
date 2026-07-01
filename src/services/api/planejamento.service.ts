import { supabase } from '../../lib/supabase';

class PlanejamentoService {
    async getRawDashboardData(tenantId: string) {
        if (!tenantId) return null;

        const MODULE_ID = '2d53a6f6-5638-45bc-a87e-1ab5d88d6134';

        const [
            { data: actions, error: errActions },
            { data: updates, error: errUpdates },
            { data: issues, error: errIssues },
            { data: axes, error: errAxes },
            { data: secretariats, error: errSecs },
            { data: actionSecretariats, error: errActSecs }
        ] = await Promise.all([
            supabase.from('planning_actions').select('*').eq('tenant_id', tenantId).eq('module_id', MODULE_ID),
            supabase.from('planning_action_updates').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabase.from('planning_action_issues').select('*').eq('tenant_id', tenantId),
            supabase.from('planning_axes').select('*').eq('tenant_id', tenantId).order('display_order', { ascending: true }),
            supabase.from('secretariats').select('*').eq('tenant_id', tenantId),
            supabase.from('planning_action_secretariats').select('*').eq('tenant_id', tenantId)
        ]);

        if (errActions) { console.error('Erro ações:', errActions); throw errActions; }
        if (errUpdates) { console.error('Erro updates:', errUpdates); throw errUpdates; }
        if (errIssues)  { console.error('Erro issues:', errIssues);  throw errIssues;  }
        if (errAxes)    { console.error('Erro axes:', errAxes);      throw errAxes;    }
        if (errSecs)    { console.error('Erro secs:', errSecs);      throw errSecs;    }
        if (errActSecs) { console.error('Erro action_secretariats:', errActSecs); }

        return {
            actions: actions || [],
            updates: updates || [],
            issues: issues || [],
            axes: axes || [],
            secretariats: secretariats || [],
            actionSecretariats: actionSecretariats || []
        };
    }

    computeDashboardData(rawData: any, filters?: any) {
        if (!rawData) return null;

        const { actions, updates, issues, axes, secretariats, actionSecretariats } = rawData;

        // Apply filters
        let filteredActions = actions;

        if (filters?.eixoId && filters.eixoId !== 'todos') {
            filteredActions = filteredActions.filter((a: any) => a.axis_id === filters.eixoId);
        }

        if (filters?.secretariaId && filters.secretariaId !== 'todas') {
            filteredActions = filteredActions.filter((a: any) => {
                const isMain = a.secretariat_id === filters.secretariaId;
                const isParticipant = actionSecretariats.some((as: any) => as.action_id === a.id && as.secretariat_id === filters.secretariaId);
                return isMain || isParticipant;
            });
        }

        if (filters?.periodo && filters.periodo !== 'todos') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let startDate = new Date(0);
            let endDate = new Date(today.getFullYear() + 10, 0, 1);

            if (filters.periodo === 'este-mes') {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
            } else if (filters.periodo === 'ultimos-30') {
                startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.periodo === 'ultimos-6') {
                startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.periodo === 'este-ano') {
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
            }

            filteredActions = filteredActions.filter((a: any) => {
                const rawDate = a.due_date || a.completion_date || a.created_at;
                if (!rawDate) return true; // fallback
                const actionDate = new Date(rawDate);
                return actionDate >= startDate && actionDate <= endDate;
            });
        }

        const safeActions      = filteredActions;
        const safeUpdates      = updates;
        const safeIssues       = issues;
        const safeAxes         = axes;
        const safeSecretariats = secretariats;

        // ── 1. Pré-processar issues (entraves ativos: tudo exceto RESOLVIDO) ──
        const openIssues = safeIssues.filter(i => i.status !== 'RESOLVIDO');

        // ── 2. Mapa de ações com risco calculado ─────────────────────────────
        const actionsMap = new Map<string, any>();
        let emAndamento   = 0;
        let concluidas    = 0;
        let emRiscoCount  = 0;

        safeActions.forEach(action => {
            if (action.status === 'EM_ANDAMENTO') emAndamento++;
            if (action.status === 'CONCLUIDA')    concluidas++;

            const actionOpenIssues = openIssues.filter(i => i.action_id === action.id);
            const hasCritical = actionOpenIssues.some(i => i.severity === 'CRITICA' || i.severity === 'ALTA');
            const hasWarning  = actionOpenIssues.some(i => i.severity === 'MEDIA' || i.severity === 'BAIXA');

            let riskStatus = 'OK';
            if (action.status === 'EM_RISCO' || hasCritical) {
                riskStatus = 'CRITICO';
            } else if (hasWarning) {
                riskStatus = 'ATENCAO';
            }

            if (action.status === 'EM_RISCO') emRiscoCount++;

            actionsMap.set(action.id, {
                ...action,
                riskStatus,
                openIssuesCount: actionOpenIssues.length,
            });
        });

        // ── 3. KPIs adicionais ───────────────────────────────────────────────
        // Ações sem NENHUMA atualização
        const actionIdsComUpdate = new Set(safeUpdates.map(u => u.action_id));
        const semAtualizacao = safeActions.filter(a =>
            !actionIdsComUpdate.has(a.id) &&
            a.status !== 'CONCLUIDA' &&
            a.status !== 'CANCELADA'
        ).length;

        // Ações com prazo vencido ou nos próximos 30 dias (excluindo concluídas/canceladas)
        const hoje = new Date();
        const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
        const prazoVencido = safeActions.filter(a => {
            if (!a.due_date) return false;
            if (a.status === 'CONCLUIDA' || a.status === 'CANCELADA') return false;
            const prazo = new Date(a.due_date);
            return prazo <= em30dias; // inclui vencidos e próximos 30 dias
        }).length;

        const kpis = {
            totalAcoes: safeActions.length,
            emAndamento,
            concluidas,
            emRisco: emRiscoCount,
            semAtualizacao,
            prazoVencido,
        };

        // ── 4. Evolução da Execução (agrupamento por data de prazo/conclusão) ──────────
        const monthsMap = new Map<string, any>();

        safeActions.forEach(action => {
            // Regra de data: due_date || start_date || created_at
            const rawDate = action.due_date || action.start_date || action.created_at;
            const date = new Date(rawDate);
            if (isNaN(date.getTime())) return;

            // Nome abreviado do mês + ano (ex: ago./24, jan./25)
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
            const yearShort = date.getFullYear().toString().slice(-2);
            const label = `${monthName}/${yearShort}`;
            
            const year = date.getFullYear();
            const sortKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthsMap.has(sortKey)) {
                monthsMap.set(sortKey, {
                    name: label,
                    timestamp: new Date(year, date.getMonth(), 1).getTime(),
                    NaoIniciadas: 0,
                    EmAndamento: 0,
                    Concluidas: 0,
                });
            }

            const m = monthsMap.get(sortKey);
            const status = action.status;

            if (status === 'NAO_INICIADA') {
                m.NaoIniciadas++;
            } else if (status === 'CONCLUIDA') {
                m.Concluidas++;
            } else if (['EM_ANDAMENTO', 'EM_RISCO', 'PARALISADA'].includes(status)) {
                m.EmAndamento++;
            }
        });

        const execucao = Array.from(monthsMap.values())
            .sort((a, b) => a.timestamp - b.timestamp);

        // ── 5. Distribuição por Eixo ─────────────────────────────────────────
        const distribuicaoEixos = safeAxes
            .map(axis => ({
                name: axis.name || 'Sem nome',
                value: safeActions.filter(a => a.axis_id === axis.id).length,
            }))
            .filter(e => e.value > 0);

        // Ações sem eixo definido
        const semEixo = safeActions.filter(a => !a.axis_id).length;
        if (semEixo > 0) {
            distribuicaoEixos.push({ name: 'Sem eixo', value: semEixo });
        }

        // ── 6. Problemas Críticos ────────────────────────────────────────────
        const problemasCriticos = openIssues
            .filter(i => i.severity === 'ALTA' || i.severity === 'CRITICA')
            .sort((a, b) => {
                // 1. CRITICA primeiro
                if (a.severity === 'CRITICA' && b.severity !== 'CRITICA') return -1;
                if (a.severity !== 'CRITICA' && b.severity === 'CRITICA') return 1;
                // 3. mais recente primeiro (created_at desc)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            })
            .map(i => {
                const acao = actionsMap.get(i.action_id);
                // Prazo: usar due_date da AÇÃO (planning_actions)
                const prazoAcao = acao?.due_date || null;
                
                return {
                    id: i.id,
                    acao: acao?.title || 'Ação desconhecida',
                    problema: i.description || i.title || 'Sem descrição',
                    severidade: i.severity === 'CRITICA' ? 'CRÍTICO' : 'ALTO',
                    prazo: prazoAcao
                        ? new Date(prazoAcao).toLocaleDateString('pt-BR')
                        : 'Sem prazo',
                    responsavel: i.responsible_name || i.responsible_sector || 'Não informado',
                };
            })
            .slice(0, 5);

        // ── 7. Ações sem Atualização Recente ─────────────────────────────────
        // Mapa: action_id → timestamp da atualização mais recente
        const latestUpdateMap = new Map<string, number>();
        safeUpdates.forEach(u => {
            if (!u.action_id) return;
            const dates: number[] = [];
            if (u.created_at) dates.push(new Date(u.created_at).getTime());
            if (u.update_date) dates.push(new Date(u.update_date).getTime());
            
            if (dates.length === 0) return;
            const latestForThisUpdate = Math.max(...dates);

            const existing = latestUpdateMap.get(u.action_id);
            if (!existing || latestForThisUpdate > existing) {
                latestUpdateMap.set(u.action_id, latestForThisUpdate);
            }
        });

        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

        const acoesSemUpdate = safeActions
            .filter(a => a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA')
            .map(action => {
                const lastUpdateTs = latestUpdateMap.get(action.id) || null;
                
                // Regra: Sem nenhuma atualização em planning_action_updates (mesma regra do KPI)
                const isSemAtualizacaoRecente = !lastUpdateTs;

                if (!isSemAtualizacaoRecente) return null;

                const diasSemUpdate = lastUpdateTs 
                    ? Math.floor((now - lastUpdateTs) / (1000 * 60 * 60 * 24))
                    : 999; // Se não tem update, consideramos muito antigo

                return {
                    id: action.id,
                    acao: action.title || 'Sem título',
                    status: action.status || 'NAO_INICIADA',
                    progresso: action.progress_percent ?? 0,
                    ultimaAtualizacao: lastUpdateTs
                        ? new Date(lastUpdateTs).toLocaleDateString('pt-BR')
                        : 'Sem atualizações',
                    diasSemUpdate,
                    _sortKey: lastUpdateTs || 0, // Mais antigas primeiro (0 para sem atualizações)
                };
            })
            .filter(item => item !== null)
            .sort((a, b) => (a?._sortKey ?? 0) - (b?._sortKey ?? 0)) // Ordena pelas mais antigas/esquecidas
            .slice(0, 5)
            .map(item => {
                if (!item) return null;
                const { _sortKey, ...rest } = item;
                return rest;
            })
            .filter(item => item !== null);

        // ── 8. Ações em Risco ────────────────────────────────────────────────
        const acoesEmRisco = Array.from(actionsMap.values())
            .filter(a => a.status === 'EM_RISCO')
            .sort((a, b) => {
                // 1. CRITICO primeiro
                if (a.riskStatus === 'CRITICO' && b.riskStatus !== 'CRITICO') return -1;
                if (a.riskStatus !== 'CRITICO' && b.riskStatus === 'CRITICO') return 1;
                
                // 2. maior quantidade de problemas
                if (b.openIssuesCount !== a.openIssuesCount) {
                    return b.openIssuesCount - a.openIssuesCount;
                }
                
                // 3. menor progress_percent
                return (a.progress_percent ?? 0) - (b.progress_percent ?? 0);
            })
            .map(a => ({
                id: a.id,
                acao: a.title || 'Sem título',
                progresso: a.progress_percent ?? 0,
                problemas: a.openIssuesCount,
                statusGeral: a.riskStatus,
            }))
            .slice(0, 5);

        // ── 9. Dados para o Mapa ─────────────────────────────────────────────
        const mapaAgregado = safeActions.map(action => {
            const sec  = safeSecretariats.find(s => s.id === action.secretariat_id);
            const risk = actionsMap.get(action.id)?.riskStatus || 'OK';

            let color = '#94a3b8';
            if (risk === 'CRITICO' || action.status === 'EM_RISCO') color = '#ef4444';
            else if (action.status === 'CONCLUIDA')    color = '#10b981';
            else if (action.status === 'EM_ANDAMENTO') color = '#8b5cf6';
            else if (action.status === 'PARALISADA')   color = '#f59e0b';

            return {
                id: action.id,
                title: action.title || 'Sem título',
                bairro: action.neighborhood || 'Centro',
                status: action.status || 'NAO_INICIADA',
                progresso: action.progress_percent ?? 0,
                secretaria: sec?.name || 'Não informada',
                responsavel: action.responsible_name || 'Não informado',
                color,
                latitude: action.latitude ?? null,
                longitude: action.longitude ?? null,
                address_street: action.address_street || '',
                address_number: action.address_number || '',
                address_district: action.address_district || '',
                address_city: action.address_city || 'Bezerros',
                address_state: action.address_state || 'PE',
                address_zipcode: action.address_zipcode || '',
            };
        });

        return {
            kpis,
            execucao,
            distribuicaoEixos,
            problemasCriticos,
            acoesSemUpdate,
            acoesEmRisco,
            mapaAgregado,
        };
    }

    async getDashboardData(tenantId: string) {
        const raw = await this.getRawDashboardData(tenantId);
        return this.computeDashboardData(raw);
    }

    async getPlanoEstrategicoData(tenantId: string) {
        if (!tenantId) return null;

        const MODULE_ID = '2d53a6f6-5638-45bc-a87e-1ab5d88d6134';

        const [
            { data: axes, error: errAxes },
            { data: objectives, error: errObj },
            { data: actions, error: errActions }
        ] = await Promise.all([
            supabase.from('planning_axes').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('display_order', { ascending: true }),
            supabase.from('planning_objectives').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('display_order', { ascending: true }),
            supabase.from('planning_actions').select('*').eq('tenant_id', tenantId).eq('module_id', MODULE_ID).not('objective_id', 'is', null)
        ]);

        if (errAxes) { console.error('Erro axes:', errAxes); throw errAxes; }
        if (errObj) { console.error('Erro objectives:', errObj); throw errObj; }
        if (errActions) { console.error('Erro actions:', errActions); throw errActions; }

        const safeAxes = axes || [];
        const safeObjectives = objectives || [];
        const safeActions = actions || [];

        // --- KPIs Gerais ---
        const totalObjetivos = safeObjectives.length;
        const totalAcoes = safeActions.length;
        
        const sumProgresso = safeActions.reduce((acc, a) => acc + (a.progress_percent || 0), 0);
        const execucaoGeral = totalAcoes > 0 ? parseFloat((sumProgresso / totalAcoes).toFixed(2)) : 0;
        
        const entregasConcluidas = safeActions.filter(a => a.status === 'CONCLUIDA').length;
        const acoesEmRisco = safeActions.filter(a => a.status === 'EM_RISCO').length;

        const kpis = {
            totalObjetivos,
            totalAcoes,
            execucaoGeral,
            entregasConcluidas,
            acoesEmRisco
        };

        // --- Compilação por Eixo ---
        const eixosCompilados = safeAxes.map(eixo => {
            const eixoObjectives = safeObjectives.filter(o => o.axis_id === eixo.id);
            const eixoActions = safeActions.filter(a => eixoObjectives.some(obj => obj.id === a.objective_id));
            
            const eSumProgresso = eixoActions.reduce((acc, a) => acc + (a.progress_percent || 0), 0);
            const eExecucao = eixoActions.length > 0 ? parseFloat((eSumProgresso / eixoActions.length).toFixed(2)) : 0;

            const objsCompilados = eixoObjectives.map(obj => {
                const objActions = eixoActions.filter(a => a.objective_id === obj.id);
                const oSumProgresso = objActions.reduce((acc, a) => acc + (a.progress_percent || 0), 0);
                const oExecucao = objActions.length > 0 ? parseFloat((oSumProgresso / objActions.length).toFixed(2)) : 0;
                
                // Status visual do objetivo baseado nas ações
                let statusObj = 'EM_ANDAMENTO';
                if (objActions.length === 0) statusObj = 'SEM_ACAO';
                else if (objActions.every(a => a.status === 'CONCLUIDA')) statusObj = 'CONCLUIDO';
                else if (objActions.some(a => a.status === 'EM_RISCO' || a.status === 'PARALISADA')) statusObj = 'ATENCAO';

                return {
                    id: obj.id,
                    title: obj.title,
                    description: obj.description,
                    acoesVinculadas: objActions.length,
                    progresso: oExecucao,
                    status: statusObj,
                    acoes: objActions
                };
            });

            return {
                id: eixo.id,
                name: eixo.name,
                description: eixo.description || '',
                color: eixo.color || '#3b82f6',
                icon: eixo.icon || 'Target',
                objetivosVinculados: eixoObjectives.length,
                acoesVinculadas: eixoActions.length,
                progresso: eExecucao,
                objetivos: objsCompilados
            };
        });

        // --- Top 5 Compromissos Prioritários ---
        // Priorizar EM_ANDAMENTO, EM_RISCO, PARALISADA, CONCLUIDA
        const prioridadeStatus: Record<string, number> = {
            'EM_RISCO': 1,
            'PARALISADA': 2,
            'EM_ANDAMENTO': 3,
            'CONCLUIDA': 4,
            'NAO_INICIADA': 5,
            'CANCELADA': 6
        };

        const compromissosPrioritarios = [...safeActions]
            .sort((a, b) => {
                // Ordenar por prioridade de status
                const pA = prioridadeStatus[a.status] || 99;
                const pB = prioridadeStatus[b.status] || 99;
                if (pA !== pB) return pA - pB;
                // Desempate por progresso decrescente
                return (b.progress_percent || 0) - (a.progress_percent || 0);
            })
            .slice(0, 4)
            .map(a => {
                const obj = safeObjectives.find(o => o.id === a.objective_id);
                const eixo = safeAxes.find(ex => ex.id === obj?.axis_id);
                return {
                    id: a.id,
                    title: a.title,
                    status: a.status,
                    progresso: a.progress_percent || 0,
                    eixoName: eixo?.name || 'Sem eixo',
                    objetivoName: obj?.title || 'Sem objetivo'
                };
            });

        return {
            kpis,
            eixos: eixosCompilados,
            compromissos: compromissosPrioritarios
        };
    }
}

export const planejamentoService = new PlanejamentoService();
