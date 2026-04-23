import { supabase } from '../../lib/supabase';

class PlanejamentoService {
    async getDashboardData(tenantId: string) {
        // OVERRIDE TEMPORÁRIO PARA DIAGNÓSTICO (Forçando o tenant validado no Supabase)
        const activeTenantId = '6e9e8e54-c9ec-42cf-a2a2-6f5e0ae8d832';
        if (!activeTenantId) return null;

        const [
            { data: actions, error: errActions },
            { data: updates, error: errUpdates },
            { data: issues, error: errIssues },
            { data: axes, error: errAxes },
            { data: secretariats, error: errSecs }
        ] = await Promise.all([
            supabase.from('planning_actions').select('*').eq('tenant_id', activeTenantId),
            supabase.from('planning_action_updates').select('*').eq('tenant_id', activeTenantId).order('update_date', { ascending: false }),
            supabase.from('planning_action_issues').select('*').eq('tenant_id', activeTenantId),
            supabase.from('planning_axes').select('*').eq('tenant_id', activeTenantId).order('display_order', { ascending: true }),
            supabase.from('secretariats').select('*').eq('tenant_id', activeTenantId)
        ]);

        if (errActions) { console.error('Erro ações:', errActions); throw errActions; }
        if (errUpdates) { console.error('Erro updates:', errUpdates); throw errUpdates; }
        if (errIssues) { console.error('Erro issues:', errIssues); throw errIssues; }
        if (errAxes) { console.error('Erro axes:', errAxes); throw errAxes; }
        if (errSecs) { console.error('Erro secs:', errSecs); throw errSecs; }

        console.log('--- DIAGNÓSTICO PLANEJAMENTO DASHBOARD ---');
        console.log('Tenant recebido do Auth:', tenantId);
        console.log('Tenant forçado na query:', activeTenantId);
        console.log(`Qtd planning_actions: ${actions?.length || 0} | updates: ${updates?.length || 0} | issues: ${issues?.length || 0} | axes: ${axes?.length || 0}`);

        const safeActions = actions || [];
        const safeUpdates = updates || [];
        const safeIssues = issues || [];
        const safeAxes = axes || [];
        const safeSecretariats = secretariats || [];

        // --- 1. Calcular KPIs Principais ---
        let totalAcoes = safeActions.length;
        let emAndamento = 0;
        let concluidas = 0;
        let emRiscoCount = 0;

        // Preparar mapa de ações para lookup
        const actionsMap = new Map();
        safeActions.forEach(action => {
            if (action.status === 'EM_ANDAMENTO') emAndamento++;
            if (action.status === 'CONCLUIDA') concluidas++;

            // Determinar o status geral (Risco)
            const actionIssues = safeIssues.filter(i => i.action_id === action.id && (i.status === 'ABERTO' || i.status === 'EM_TRATAMENTO'));
            let riskStatus = 'OK';
            
            const hasCritical = actionIssues.some(i => i.severity === 'CRITICA' || i.severity === 'ALTA');
            const hasMedium = actionIssues.some(i => i.severity === 'MEDIA');

            if (hasCritical) {
                riskStatus = 'CRITICO';
            } else if (hasMedium) {
                riskStatus = 'ATENCAO';
            }

            if (riskStatus === 'CRITICO' || riskStatus === 'ATENCAO') {
                emRiscoCount++;
            }

            actionsMap.set(action.id, {
                ...action,
                riskStatus,
                openIssuesCount: actionIssues.length
            });
        });

        const kpis = {
            totalAcoes,
            emAndamento,
            concluidas,
            emRisco: emRiscoCount
        };

        // --- 2. Evolução da Execução ---
        // Agrupar updates por mês/ano usando o `update_date`.
        const monthsMap = new Map();
        
        // Reverse updates to process chronologically for snapshot history
        const sortedUpdates = [...safeUpdates].sort((a, b) => new Date(a.update_date).getTime() - new Date(b.update_date).getTime());
        
        sortedUpdates.forEach(update => {
            const date = new Date(update.update_date);
            if (isNaN(date.getTime())) return;
            
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
            const year = date.getFullYear();
            const key = `${monthName}/${year}`;

            if (!monthsMap.has(key)) {
                monthsMap.set(key, { name: monthName, timestamp: new Date(year, date.getMonth(), 1).getTime(), NaoIniciadas: 0, EmAndamento: 0, Concluidas: 0 });
            }
            
            const mData = monthsMap.get(key);
            if (update.status_snapshot === 'NAO_INICIADA') mData.NaoIniciadas++;
            else if (update.status_snapshot === 'EM_ANDAMENTO') mData.EmAndamento++;
            else if (update.status_snapshot === 'CONCLUIDA') mData.Concluidas++;
        });

        // 2.1 Incluir ações sem NENHUM update (Fallback)
        safeActions.forEach(action => {
            const actionHasUpdates = safeUpdates.some(u => u.action_id === action.id);
            if (!actionHasUpdates) {
                const date = new Date(action.start_date || action.created_at);
                if (isNaN(date.getTime())) return;
                
                const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
                const year = date.getFullYear();
                const key = `${monthName}/${year}`;

                if (!monthsMap.has(key)) {
                    monthsMap.set(key, { name: monthName, timestamp: new Date(year, date.getMonth(), 1).getTime(), NaoIniciadas: 0, EmAndamento: 0, Concluidas: 0 });
                }
                
                const mData = monthsMap.get(key);
                if (action.status === 'NAO_INICIADA') mData.NaoIniciadas++;
                else if (action.status === 'EM_ANDAMENTO') mData.EmAndamento++;
                else if (action.status === 'CONCLUIDA') mData.Concluidas++;
            }
        });

        // Ordenar os meses cronologicamente
        let execucao = Array.from(monthsMap.values()).sort((a, b) => a.timestamp - b.timestamp);

        // --- 3. Distribuição por Eixo ---
        const distribuicaoEixos = safeAxes.map(axis => {
            const count = safeActions.filter(a => a.axis_id === axis.id).length;
            return {
                name: axis.name,
                value: count
            };
        }).filter(axis => axis.value > 0);

        // Filtrar ABERTOS/EM_TRATAMENTO com severidade ALTA ou CRITICA, ordenados por due_date
        const problemasCriticos = safeIssues
            .filter(i => (i.status === 'ABERTO' || i.status === 'EM_TRATAMENTO') && (i.severity === 'ALTA' || i.severity === 'CRITICA'))
            .sort((a, b) => new Date(a.due_date || '9999-12-31').getTime() - new Date(b.due_date || '9999-12-31').getTime())
            .map(i => {
                const acao = actionsMap.get(i.action_id);
                return {
                    id: i.id,
                    acao: acao ? acao.title : 'Ação desconhecida',
                    problema: i.title,
                    severidade: 'CRITICO', // Visual map
                    prazo: i.due_date ? new Date(i.due_date).toLocaleDateString('pt-BR') : 'Sem prazo',
                    responsavel: i.responsible_name || i.responsible_sector || 'Não informado'
                };
            }).slice(0, 5); // top 5

        // --- 5. Ranking de Setores ---
        const sectorsMap = new Map();
        safeIssues.filter(i => i.status === 'ABERTO' || i.status === 'EM_TRATAMENTO').forEach(issue => {
            const sector = issue.responsible_sector || 'Não informado';
            sectorsMap.set(sector, (sectorsMap.get(sector) || 0) + 1);
        });

        const rankingSetores = Array.from(sectorsMap.entries())
            .map(([setor, problemas]) => ({ id: setor, setor, problemas }))
            .sort((a, b) => b.problemas - a.problemas)
            .slice(0, 5); // top 5

        // --- 6. Ações sem Atualização Recente ---
        // Cruzar actions com o array de updates (que já está ordenado desc por update_date)
        const acoesSemUpdateRaw = safeActions.map(action => {
            const actionUpdates = safeUpdates.filter(u => u.action_id === action.id);
            const latestUpdate = actionUpdates.length > 0 ? actionUpdates[0].update_date : null;
            // Se null, usa created_at (muito antiga)
            const dateToCompare = latestUpdate ? new Date(latestUpdate) : new Date(action.created_at);
            
            return {
                id: action.id,
                acao: action.title,
                status: action.status,
                progresso: action.progress_percent || 0,
                ultimaAtualizacao: latestUpdate ? new Date(latestUpdate).toLocaleDateString('pt-BR') : 'Sem atualizações',
                dateTimestamp: dateToCompare.getTime()
            };
        });

        // Ordenar as mais antigas primeiro
        const acoesSemUpdate = acoesSemUpdateRaw
            .sort((a, b) => a.dateTimestamp - b.dateTimestamp)
            .map(a => {
                delete a.dateTimestamp;
                return a;
            })
            .slice(0, 5); // top 5

        // --- 7. Ações em Risco ---
        const acoesEmRisco = Array.from(actionsMap.values())
            .filter(a => a.riskStatus === 'CRITICO' || a.riskStatus === 'ATENCAO')
            .sort((a, b) => {
                // Critico vem primeiro
                if (a.riskStatus === 'CRITICO' && b.riskStatus !== 'CRITICO') return -1;
                if (a.riskStatus !== 'CRITICO' && b.riskStatus === 'CRITICO') return 1;
                return b.openIssuesCount - a.openIssuesCount;
            })
            .map(a => ({
                id: a.id,
                acao: a.title,
                progresso: a.progress_percent || 0,
                problemas: a.openIssuesCount,
                statusGeral: a.riskStatus
            }))
            .slice(0, 5);

        // --- 8. Agregação para o Mapa ---
        const mapaDataMap = new Map();
        
        safeSecretariats.forEach((sec, idx) => {
            // Centro em Bezerros/PE (-8.2342, -35.7963)
            // Pequeno deslocamento determinístico para evitar sobreposição total e criar uma visualização limpa
            const lat = -8.2342 + (Math.sin(idx * 1.5) * 0.008);
            const lng = -35.7963 + (Math.cos(idx * 1.5) * 0.008);
            
            mapaDataMap.set(sec.id, {
                secretariaId: sec.id,
                nome: sec.name,
                lat,
                lng,
                total: 0,
                concluidas: 0,
                emAndamento: 0,
                naoIniciadas: 0,
                emRisco: 0,
                color: '#64748b'
            });
        });

        Array.from(actionsMap.values()).forEach(action => {
            if (action.secretariat_id && mapaDataMap.has(action.secretariat_id)) {
                const mapEntry = mapaDataMap.get(action.secretariat_id);
                mapEntry.total++;
                if (action.status === 'CONCLUIDA') mapEntry.concluidas++;
                else if (action.status === 'EM_ANDAMENTO') mapEntry.emAndamento++;
                else if (action.status === 'NAO_INICIADA') mapEntry.naoIniciadas++;
                
                if (action.riskStatus === 'CRITICO' || action.riskStatus === 'ATENCAO') {
                    mapEntry.emRisco++;
                }
            }
        });

        const mapaAgregado = Array.from(mapaDataMap.values()).filter(m => m.total > 0).map(m => {
            let color = '#64748b'; // Neutro
            if (m.emRisco > 0) color = '#f43f5e'; // Vermelho (Risco)
            else if (m.emAndamento > 0) color = '#9f7aea'; // Roxo (Andamento)
            else if (m.concluidas > 0) color = '#10b981'; // Verde (Concluídas)
            return { ...m, color };
        });

        const finalData = {
            kpis,
            execucao,
            distribuicaoEixos,
            problemasCriticos,
            rankingSetores,
            acoesSemUpdate,
            acoesEmRisco,
            mapaAgregado
        };

        // console.log('--- OBJETO FINAL DASHBOARD ---', finalData);
        return finalData;
    }
}

export const planejamentoService = new PlanejamentoService();
