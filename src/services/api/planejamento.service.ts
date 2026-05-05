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

        // ── 1. Pré-processar issues (enums do banco: ABERTO, EM_TRATAMENTO, RESOLVIDO / CRITICA, ALTA…) ──
        const openIssues = safeIssues.filter(i =>
            i.status === 'ABERTO' || i.status === 'EM_TRATAMENTO'
        );

        // ── 2. Mapa de ações com risco calculado ─────────────────────────────
        const actionsMap = new Map<string, any>();
        let emAndamento   = 0;
        let concluidas    = 0;
        let emRiscoCount  = 0;

        safeActions.forEach(action => {
            if (action.status === 'EM_ANDAMENTO') emAndamento++;
            if (action.status === 'CONCLUIDA')    concluidas++;

            // Risco: ação EM_RISCO/PARALISADA OU entrave ALTA/CRITICA em aberto
            const actionOpenIssues = openIssues.filter(i => i.action_id === action.id);
            const hasCritical = actionOpenIssues.some(i => i.severity === 'CRITICA' || i.severity === 'ALTA');
            const hasMedium   = actionOpenIssues.some(i => i.severity === 'MEDIA');

            let riskStatus = 'OK';
            if (action.status === 'EM_RISCO' || action.status === 'PARALISADA' || hasCritical) {
                riskStatus = 'CRITICO';
            } else if (hasMedium) {
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

        // ── 4. Evolução da Execução (gráfico de barras por mês) ──────────────
        const monthsMap = new Map<string, any>();

        // Processar updates cronologicamente
        const sortedUpdates = [...safeUpdates].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        sortedUpdates.forEach(update => {
            const date = new Date(update.created_at);
            if (isNaN(date.getTime())) return;

            const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
            const year = date.getFullYear();
            const key = `${monthName}/${year}`;

            if (!monthsMap.has(key)) {
                monthsMap.set(key, {
                    name: monthName,
                    timestamp: new Date(year, date.getMonth(), 1).getTime(),
                    NaoIniciadas: 0,
                    EmAndamento: 0,
                    Concluidas: 0,
                    Paralisadas: 0,
                });
            }

            const m = monthsMap.get(key);
            const snap = update.status_snapshot;
            if (snap === 'NAO_INICIADA')  m.NaoIniciadas++;
            else if (snap === 'EM_ANDAMENTO' || snap === 'EM_RISCO') m.EmAndamento++;
            else if (snap === 'CONCLUIDA')  m.Concluidas++;
            else if (snap === 'PARALISADA') m.Paralisadas++;
        });

        // Fallback: ações sem nenhum update aparecem no mês de criação
        safeActions.forEach(action => {
            if (actionIdsComUpdate.has(action.id)) return;

            const date = new Date(action.created_at);
            if (isNaN(date.getTime())) return;

            const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
            const year = date.getFullYear();
            const key = `${monthName}/${year}`;

            if (!monthsMap.has(key)) {
                monthsMap.set(key, {
                    name: monthName,
                    timestamp: new Date(year, date.getMonth(), 1).getTime(),
                    NaoIniciadas: 0,
                    EmAndamento: 0,
                    Concluidas: 0,
                    Paralisadas: 0,
                });
            }

            const m = monthsMap.get(key);
            if (action.status === 'NAO_INICIADA')  m.NaoIniciadas++;
            else if (action.status === 'EM_ANDAMENTO' || action.status === 'EM_RISCO') m.EmAndamento++;
            else if (action.status === 'CONCLUIDA')  m.Concluidas++;
            else if (action.status === 'PARALISADA') m.Paralisadas++;
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
            .sort((a, b) =>
                new Date(a.due_date || '9999-12-31').getTime() -
                new Date(b.due_date || '9999-12-31').getTime()
            )
            .map(i => {
                const acao = actionsMap.get(i.action_id);
                return {
                    id: i.id,
                    acao: acao?.title || 'Ação desconhecida',
                    // Usar description (campo real); title pode ser gerado automaticamente
                    problema: i.description || i.title || 'Sem descrição',
                    severidade: i.severity === 'CRITICA' ? 'CRÍTICO' : 'ALTO',
                    prazo: i.due_date
                        ? new Date(i.due_date).toLocaleDateString('pt-BR')
                        : 'Sem prazo',
                    responsavel: i.responsible_name || i.responsible_sector || 'Não informado',
                };
            })
            .slice(0, 5);

        // ── 7. Ações sem Atualização Recente ─────────────────────────────────
        // Mapa: action_id → created_at da atualização mais recente
        const latestUpdateMap = new Map<string, string>();
        safeUpdates.forEach(u => {
            if (!u.action_id) return;
            const existing = latestUpdateMap.get(u.action_id);
            if (!existing || u.created_at > existing) {
                latestUpdateMap.set(u.action_id, u.created_at);
            }
        });

        const acoesSemUpdate = safeActions
            .filter(a => a.status !== 'CONCLUIDA' && a.status !== 'CANCELADA')
            .map(action => {
                const lastUpdate = latestUpdateMap.get(action.id) || null;
                const dateRef = lastUpdate
                    ? new Date(lastUpdate).getTime()
                    : new Date(action.created_at).getTime();

                const diasSemUpdate = Math.floor(
                    (Date.now() - (lastUpdate ? new Date(lastUpdate).getTime() : new Date(action.created_at).getTime()))
                    / (1000 * 60 * 60 * 24)
                );

                return {
                    id: action.id,
                    acao: action.title || 'Sem título',
                    status: action.status || 'NAO_INICIADA',
                    progresso: action.progress_percent ?? 0,
                    ultimaAtualizacao: lastUpdate
                        ? new Date(lastUpdate).toLocaleDateString('pt-BR')
                        : 'Sem atualizações',
                    diasSemUpdate,
                    _sortKey: dateRef,
                };
            })
            .sort((a, b) => a._sortKey - b._sortKey) // mais antigas primeiro
            .map(({ _sortKey, ...rest }) => rest)
            .slice(0, 5);

        // ── 8. Ações em Risco ────────────────────────────────────────────────
        const acoesEmRisco = Array.from(actionsMap.values())
            .filter(a => a.riskStatus === 'CRITICO' || a.riskStatus === 'ATENCAO')
            .sort((a, b) => {
                if (a.riskStatus === 'CRITICO' && b.riskStatus !== 'CRITICO') return -1;
                if (a.riskStatus !== 'CRITICO' && b.riskStatus === 'CRITICO') return 1;
                return b.openIssuesCount - a.openIssuesCount;
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
