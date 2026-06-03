import { supabase } from '../../lib/supabase';

class PlanejamentoService {
    async getDashboardData(tenantId: string) {
        if (!tenantId) return null;

        // module_id fixo do módulo PLANEJAMENTO_ESTRATEGICO
        const MODULE_ID = '2d53a6f6-5638-45bc-a87e-1ab5d88d6134';

        const [
            { data: actions, error: errActions },
            { data: updates, error: errUpdates },
            { data: issues, error: errIssues },
            { data: axes, error: errAxes },
            { data: secretariats, error: errSecs }
        ] = await Promise.all([
            supabase.from('planning_actions').select('*').eq('tenant_id', tenantId).eq('module_id', MODULE_ID),
            // Usar created_at — campo real da tabela planning_action_updates
            supabase.from('planning_action_updates').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
            supabase.from('planning_action_issues').select('*').eq('tenant_id', tenantId),
            supabase.from('planning_axes').select('*').eq('tenant_id', tenantId).order('display_order', { ascending: true }),
            supabase.from('secretariats').select('*').eq('tenant_id', tenantId)
        ]);

        if (errActions) { console.error('Erro ações:', errActions); throw errActions; }
        if (errUpdates) { console.error('Erro updates:', errUpdates); throw errUpdates; }
        if (errIssues)  { console.error('Erro issues:', errIssues);  throw errIssues;  }
        if (errAxes)    { console.error('Erro axes:', errAxes);      throw errAxes;    }
        if (errSecs)    { console.error('Erro secs:', errSecs);      throw errSecs;    }

        console.log('--- DIAGNÓSTICO PLANEJAMENTO DASHBOARD ---');
        console.log('Tenant:', tenantId, '| Module:', MODULE_ID);
        console.log(`actions: ${actions?.length ?? 0} | updates: ${updates?.length ?? 0} | issues: ${issues?.length ?? 0} | axes: ${axes?.length ?? 0}`);

        const safeActions      = actions      || [];
        const safeUpdates      = updates      || [];
        const safeIssues       = issues       || [];
        const safeAxes         = axes         || [];
        const safeSecretariats = secretariats || [];

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

            if (riskStatus !== 'OK') emRiscoCount++;

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
                
                // Regra: Sem atualização OU última atualização > 30 dias
                const isSemAtualizacaoRecente = !lastUpdateTs || (now - lastUpdateTs > THIRTY_DAYS_MS);

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
            .filter(a => a.riskStatus === 'CRITICO' || a.riskStatus === 'ATENCAO')
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
}

export const planejamentoService = new PlanejamentoService();
